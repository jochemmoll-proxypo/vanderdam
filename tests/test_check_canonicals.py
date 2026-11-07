from email.utils import getaddresses
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import MagicMock, patch

spec = importlib.util.spec_from_file_location('monitor', Path(__file__).resolve().parents[1] / 'scripts/check_canonicals.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
URL = 'https://sportnieuws.nl/tennis/nieuws/example-123/'
XML = f'''<urlset xmlns="{m.NS['s']}" xmlns:news="{m.NS['n']}"><url><loc>{URL}</loc>
<news:news><news:publication_date>2026-11-07T19:00:00+01:00</news:publication_date>
<news:title>Example</news:title></news:news></url></urlset>'''.encode()


class MonitorTests(unittest.TestCase):
    def test_canonical_variants(self):
        for html in ['', '<link rel="canonical">', '<link rel="canonical" href="">',
                     '<link rel="canonical" href=" &#32; ">',
                     '<link rel="canonical" href="ok"><link rel="canonical" href="">']:
            with self.subTest(html=html):
                self.assertIsNotNone(m.canonical_problem(html))
        self.assertIsNone(m.canonical_problem('<LINK href="https://sportnieuws.nl/x/" REL="alternate CANONICAL"/>'))

    def test_sitemap_dates_and_scope(self):
        self.assertEqual(m.articles(XML)[URL]['published'], '2026-11-07T19:00:00+01:00')
        for url in ['https://evil.example/nieuws/x/', 'http://sportnieuws.nl/nieuws/x/',
                    'https://sportnieuws.nl/category/', 'https://sportnieuws.nl:999/nieuws/x/']:
            self.assertFalse(m.article_url(url))
        with self.assertRaises(ValueError):
            m.articles(b'<urlset/>')

    def test_smtp_tls_and_both_recipients(self):
        settings = {'SMTP_HOST':'smtp.example.com', 'SMTP_PORT':'587',
                    'SMTP_USERNAME':'monitor', 'SMTP_PASSWORD':'test-only',
                    'SMTP_FROM':'monitor@example.com'}
        with patch.dict(m.os.environ, settings), patch.object(m.smtplib, 'SMTP') as factory:
            client = factory.return_value.__enter__.return_value
            client.send_message.return_value = {}
            m.send_alert({URL:{'title':'Example','problem':'Empty canonical'}})
            client.starttls.assert_called_once()
            client.login.assert_called_once_with('monitor', 'test-only')
            message = client.send_message.call_args.args[0]
            self.assertEqual([address for _, address in getaddresses(message.get_all('To'))], m.RECIPIENTS)
            self.assertIn(URL, message.get_content())

    def test_consent_redirect_is_not_treated_as_missing_canonical(self):
        response = MagicMock()
        response.url = 'https://myprivacy.dpgmedia.nl/consent'
        with patch.object(m, 'urlopen') as opener:
            opener.return_value.__enter__.return_value = response
            with self.assertRaisesRegex(ValueError, 'consent'):
                m.fetch(URL)

    def execute(self, responses, mail_error=None, initial=None, dry_run=False):
        with tempfile.TemporaryDirectory() as directory:
            state_path = Path(directory) / 'state.json'
            state_path.write_text(json.dumps(initial or {'started_at':'2026-11-07T17:00:00+00:00','checked':{},'pending':{}}))
            original = state_path.read_text()
            with patch.object(m, 'smtp_settings'), patch.object(m, 'fetch', side_effect=responses), \
                 patch.object(m, 'send_alert', side_effect=mail_error) as sender:
                code = m.run(state_path, dry_run)
            return code, json.loads(state_path.read_text()), sender.call_count, original == state_path.read_text()

    def test_success_records_article_without_email(self):
        code, state, sent, _ = self.execute([(XML,'utf-8'), (b'<link rel="canonical" href="ok">','utf-8')])
        self.assertEqual((code, sent), (0, 0))
        self.assertIn(URL, state['checked'])
        self.assertEqual(state['pending'], {})

    def test_confirmed_empty_sends_and_records(self):
        code, state, sent, _ = self.execute([(XML,'utf-8'), (b'<link rel="canonical" href="">','utf-8'), (b'','utf-8')])
        self.assertEqual((code, sent), (0, 1))
        self.assertIn(URL, state['checked'])

    def test_email_failure_retains_retry_even_after_sitemap_removal(self):
        code, state, sent, _ = self.execute([(XML,'utf-8'), (b'','utf-8'), (b'','utf-8')], RuntimeError('SMTP down'))
        self.assertEqual((code, sent), (1, 1))
        self.assertIn(URL, state['pending'])
        self.assertNotIn(URL, state['checked'])
        other_xml = XML.replace(b'example-123', b'example-456')
        code, state, sent, _ = self.execute([(other_xml,'utf-8'), (b'','utf-8'), (b'','utf-8'),
                                          (b'<link rel="canonical" href="ok">','utf-8')], initial=state)
        self.assertEqual((code, sent), (0, 1))
        self.assertEqual(state['pending'], {})

    def test_fetch_failure_retains_retry(self):
        code, state, sent, _ = self.execute([(XML,'utf-8'), TimeoutError()])
        self.assertEqual((code, sent), (1, 0))
        self.assertIn(URL, state['pending'])

    def test_already_checked_and_older_articles_skipped(self):
        state = {'started_at':'2026-11-07T17:00:00+00:00', 'checked':{URL:'2026-11-07T18:00:00+00:00'}, 'pending':{}}
        code, _, sent, _ = self.execute([(XML,'utf-8')], initial=state)
        self.assertEqual((code, sent), (0, 0))
        state = {'started_at':'2026-11-07T19:00:00+00:00', 'checked':{}, 'pending':{}}
        code, state, sent, _ = self.execute([(XML,'utf-8')], initial=state)
        self.assertEqual(state['checked'], {})
        self.assertEqual((code, sent), (0, 0))

    def test_dry_run_never_sends_or_saves(self):
        code, _, sent, unchanged = self.execute([(XML,'utf-8'), (b'','utf-8'), (b'','utf-8')], dry_run=True)
        self.assertEqual((code, sent, unchanged), (0, 0, True))


if __name__ == '__main__':
    unittest.main()
