#!/usr/bin/env python3
"""Check newly published Sportnieuws articles and email empty canonical alerts."""
import argparse
from datetime import datetime, timezone
from email.message import EmailMessage
from html.parser import HTMLParser
import json
import os
from pathlib import Path
import smtplib
import ssl
import sys
from urllib.parse import urlparse
from urllib.request import Request, urlopen
from xml.etree import ElementTree as ET

SITEMAP = 'https://sportnieuws.nl/sitemaps/sitemap-news.xml'
RECIPIENTS = ['Jochem.moll@persgroep.net', 'rhian.ket@persgroep.net']
NS = {'s': 'http://www.sitemaps.org/schemas/sitemap/0.9',
      'n': 'http://www.google.com/schemas/sitemap-news/0.9'}


class Canonicals(HTMLParser):
    def __init__(self):
        super().__init__()
        self.values = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'link' and 'canonical' in attrs.get('rel', '').lower().split():
            self.values.append((attrs.get('href') or '').strip())

    handle_startendtag = handle_starttag


def canonical_problem(html):
    parser = Canonicals()
    parser.feed(html)
    if not parser.values:
        return 'Canonical link tag is missing'
    if any(not value for value in parser.values):
        return 'Canonical href is missing, empty or whitespace-only'
    return None


def article_url(url):
    parsed = urlparse(url)
    return (parsed.scheme == 'https' and parsed.hostname in {'sportnieuws.nl', 'www.sportnieuws.nl'}
            and parsed.port in {None, 443} and not parsed.username and not parsed.password
            and '/nieuws/' in parsed.path)


def fetch(url):
    request = Request(url, headers={'Cache-Control': 'no-cache'})
    with urlopen(request, timeout=30) as response:
        if urlparse(response.url).hostname not in {'sportnieuws.nl', 'www.sportnieuws.nl'}:
            raise ValueError('Unexpected redirect host (possibly a consent page)')
        if article_url(url) and not article_url(response.url):
            raise ValueError('Article redirected to a non-article page')
        data = response.read(8_000_001)
        if len(data) > 8_000_000:
            raise ValueError('Response exceeds 8 MB')
        return data, response.headers.get_content_charset() or 'utf-8'


def articles(xml):
    result = {}
    for node in ET.fromstring(xml).findall('s:url', NS):
        url = node.findtext('s:loc', '', NS).strip()
        published = node.findtext('n:news/n:publication_date', '', NS)
        if not article_url(url) or not published:
            continue
        stamp = datetime.fromisoformat(published.replace('Z', '+00:00'))
        if stamp.tzinfo is None:
            raise ValueError('Sitemap publication date has no timezone')
        result[url] = {'published': stamp.isoformat(),
                       'title': node.findtext('n:news/n:title', url, NS)}
    if not result:
        raise ValueError('No article entries found; state has not advanced')
    return result


def smtp_settings():
    names = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USERNAME', 'SMTP_PASSWORD', 'SMTP_FROM']
    missing = [name for name in names if not os.environ.get(name)]
    if missing:
        raise ValueError('Missing repository secrets: ' + ', '.join(missing))
    port = int(os.environ['SMTP_PORT'])
    if port not in {465, 587}:
        raise ValueError('SMTP_PORT must be 465 (TLS) or 587 (STARTTLS)')
    return port


def send_alert(problems, test=False):
    port = smtp_settings()
    message = EmailMessage()
    message['From'] = os.environ['SMTP_FROM']
    message['To'] = ', '.join(RECIPIENTS)
    message['Subject'] = ('[Sportnieuws] Monitor test email' if test else
                          f'[Sportnieuws] Empty or missing canonical: {len(problems)} new article(s)')
    lines = [f'Checked at {datetime.now(timezone.utc).isoformat()}', '']
    if test:
        lines.append('This is a delivery test for the hourly Sportnieuws canonical monitor. '
                     'No canonical issue is being reported. Both configured recipients receive this test.')
    for url, item in problems.items():
        lines.extend([item['title'], url, item['problem'], ''])
    message.set_content('\n'.join(lines))
    context = ssl.create_default_context()
    if port == 465:
        client = smtplib.SMTP_SSL(os.environ['SMTP_HOST'], port, timeout=30, context=context)
    else:
        client = smtplib.SMTP(os.environ['SMTP_HOST'], port, timeout=30)
    with client:
        if port == 587:
            client.starttls(context=context)
        client.login(os.environ['SMTP_USERNAME'], os.environ['SMTP_PASSWORD'])
        refused = client.send_message(message)
        if refused:
            raise RuntimeError('SMTP refused one or more alert recipients; articles will be retried')


def run(state_path, dry_run=False):
    if not dry_run:
        smtp_settings()  # Fail visibly before advancing state if delivery is not configured.
    state = json.loads(state_path.read_text())
    started = datetime.fromisoformat(state['started_at'])
    seen = state.setdefault('checked', {})
    pending = state.setdefault('pending', {})
    xml, _ = fetch(SITEMAP)
    discovered = articles(xml)
    for url, item in discovered.items():
        if datetime.fromisoformat(item['published']) >= started and url not in seen:
            pending.setdefault(url, item)
    problems, errors = {}, []
    for url, item in list(pending.items()):
        try:
            data, charset = fetch(url)
            problem = canonical_problem(data.decode(charset, errors='replace'))
            if problem:
                # Confirm a faulty response before alerting; fetch failures stay pending.
                data, charset = fetch(url)
                problem = canonical_problem(data.decode(charset, errors='replace'))
            if problem:
                problems[url] = {**item, 'problem': problem}
            else:
                seen[url] = item['published']
                del pending[url]
        except Exception as error:
            errors.append(url)
            print(f'Unable to check {url}: {type(error).__name__}; retained for retry', file=sys.stderr)
    if problems:
        for url, item in problems.items():
            print(f"{item['problem']}: {url}")
        if not dry_run:
            try:
                send_alert(problems)
            except Exception as error:
                errors.append('email')
                print(f'Email delivery failed ({type(error).__name__}); alerts retained for retry', file=sys.stderr)
            else:
                for url in problems:
                    seen[url] = pending.pop(url)['published']
                print(f'Alert accepted by SMTP for {len(problems)} article(s).')
    print(f'Checked {len(seen)} recorded articles; {len(pending)} pending; {len(problems)} canonical issue(s).')
    if not dry_run:
        # Keep successes even if another article or email fails; retries remain pending.
        temporary = state_path.with_suffix('.tmp')
        temporary.write_text(json.dumps(state, indent=2, sort_keys=True) + '\n')
        temporary.replace(state_path)
    return 1 if errors else 0


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--state', type=Path, default=Path('monitoring/sportnieuws-state.json'))
    parser.add_argument('--dry-run', action='store_true', help='Check without email or saving state')
    parser.add_argument('--test-email', action='store_true', help='Send a labeled delivery test without changing monitoring state')
    args = parser.parse_args()
    if args.test_email and args.dry_run:
        parser.error('--test-email and --dry-run cannot be combined')
    try:
        if args.test_email:
            send_alert({}, test=True)
            print('Test email accepted by SMTP for both configured recipients.')
            return 0
        return run(args.state, args.dry_run)
    except Exception as error:
        print(f'Monitor stopped: {error}', file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
