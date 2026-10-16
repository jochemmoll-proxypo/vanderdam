import copy
import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch
import tempfile
import json

spec = importlib.util.spec_from_file_location('publisher', Path(__file__).parents[1] / 'scripts/publish_daily.py')
publisher = importlib.util.module_from_spec(spec)
spec.loader.exec_module(publisher)

class PublicationChecks(unittest.TestCase):
    def setUp(self):
        self.story = {
            'date': '2026-10-16', 'event_date': '1968-10-16',
            'title': 'Testverhaal', 'sport': 'Atletiek', 'intro': 'Introductie',
            'paragraphs': [' '.join(['woord'] * 110) for _ in range(3)],
            'sources': [
                {'title': 'Bron A', 'url': 'https://example.com/a'},
                {'title': 'Bron B', 'url': 'https://example.org/b'},
            ],
        }
        self.urls = {s['url'] for s in self.story['sources']}

    def test_accepts_complete_story_with_researched_sources(self):
        publisher.validate(self.story, '2026-10-16', self.urls)

    def test_rejects_event_on_another_day(self):
        self.story['event_date'] = '1968-10-18'
        with self.assertRaises(ValueError):
            publisher.validate(self.story, '2026-10-16', self.urls)

    def test_rejects_future_event(self):
        self.story['event_date'] = '2027-10-16'
        with self.assertRaises(ValueError):
            publisher.validate(self.story, '2026-10-16', self.urls)

    def test_rejects_invented_source(self):
        with self.assertRaises(ValueError):
            publisher.validate(self.story, '2026-10-16', {'https://example.com/a'})

    def test_rejects_two_sources_from_same_domain(self):
        self.story['sources'][1]['url'] = 'https://www.example.com/b'
        with self.assertRaises(ValueError):
            publisher.validate(self.story, '2026-10-16', {s['url'] for s in self.story['sources']})

    def test_missing_key_leaves_archive_unchanged(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'index.json'
            path.write_text('[]\n')
            with patch.object(publisher, 'INDEX', path), patch.dict('os.environ', {}, clear=True):
                with self.assertRaises(RuntimeError):
                    publisher.main()
            self.assertEqual(path.read_text(), '[]\n')

    def test_existing_story_skips_api_call(self):
        today = publisher.datetime.now(publisher.ZoneInfo('Europe/Amsterdam')).date().isoformat()
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'index.json'
            path.write_text(json.dumps([{'date': today}]))
            with patch.object(publisher, 'INDEX', path), patch.object(publisher, 'urlopen') as request:
                publisher.main()
                request.assert_not_called()

if __name__ == '__main__':
    unittest.main()
