'use strict';
const tz = 'Europe/Amsterdam';
const now = new Date();
const dateKey = new Intl.DateTimeFormat('en-CA', {timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit'}).format(now);
const formatDate = value => new Intl.DateTimeFormat('en-GB', {day: 'numeric', month: 'long', year: 'numeric', timeZone: tz}).format(new Date(`${value}T12:00:00Z`));
document.querySelector('#today').textContent = formatDate(dateKey).toUpperCase();
document.querySelector('#today').dateTime = dateKey;
document.querySelector('#day-number').textContent = dateKey.slice(-2);
document.querySelector('#month-name').textContent = new Intl.DateTimeFormat('en-GB', {month: 'long', timeZone: tz}).format(now);
document.querySelector('#year').textContent = now.getFullYear();
function el(tag, text, cls) { const node = document.createElement(tag); if (text) node.textContent = text; if (cls) node.className = cls; return node; }
function empty(message) {
  const box = document.querySelector('#story');
  box.replaceChildren(el('p', 'TODAY IN SPORTS', 'eyebrow'), el('h2', 'The next chapter is on its way.'), el('p', message));
}
function showStory(story) {
  const box = document.querySelector('#story');
  box.replaceChildren(el('p', `${story.sport} / ${story.event_date.slice(0, 4)}`, 'eyebrow'), el('h2', story.title), el('p', story.intro));
  const link = el('a', 'Read the story ↗', 'read-link'); link.href = '#article'; box.append(link);
  const article = document.querySelector('#article'); article.hidden = false;
  article.replaceChildren(el('p', `Happened on ${formatDate(story.event_date)} · Published on ${formatDate(story.date)}`, 'meta'));
  story.paragraphs.forEach(p => article.append(el('p', p)));
  const sources = el('div', null, 'sources'); sources.append(el('strong', 'Sources & transparency'));
  const list = el('ul');
  story.sources.forEach(source => {
    const url = new URL(source.url); if (url.protocol !== 'https:') return;
    const item = el('li'); const a = el('a', source.title); a.href = url.href; a.target = '_blank'; a.rel = 'noopener noreferrer'; item.append(a); list.append(item);
  });
  sources.append(list, el('p', 'Researched and written with AI. Follow the source links to check the facts for yourself.')); article.append(sources);
}
async function init() {
  try {
    const response = await fetch('stories/index.json', {cache: 'no-cache'}); if (!response.ok) throw new Error('Archive unavailable');
    const stories = (await response.json()).filter(s => s.date <= dateKey).sort((a,b) => b.date.localeCompare(a.date));
    const selected = new URLSearchParams(location.search).get('story') || dateKey;
    const story = stories.find(s => s.date === selected);
    if (story) {
      showStory(story);
      if (story.date !== dateKey) {
        document.querySelector('#day-number').textContent = story.date.slice(-2);
        document.querySelector('#month-name').textContent = new Intl.DateTimeFormat('en-GB', {month: 'long', timeZone: tz}).format(new Date(`${story.date}T12:00:00Z`));
      }
    } else empty(selected === dateKey ? 'Today’s sporting history story will appear here once research and source checks are complete. In the meantime, explore earlier stories in the archive.' : 'This story is unavailable. Choose a story from the archive.');
    const archive = document.querySelector('#archive-list'); archive.replaceChildren();
    if (!stories.length) archive.append(el('p', 'The first page is still waiting to be written. Published stories will find their home here.', 'archive-empty'));
    stories.forEach(s => {
      const a = el('a', null, 'archive-row'); a.href = `?story=${encodeURIComponent(s.date)}#daily`;
      const time = el('time', formatDate(s.date)); time.dateTime = s.date; a.append(time, el('strong', s.title), el('span', `${s.sport} ↗`)); archive.append(a);
    });
  } catch (error) {
    empty('The stories could not be loaded. Please try again later.');
    document.querySelector('#archive-list').replaceChildren(el('p', 'The archive is temporarily unavailable.', 'archive-empty'));
    console.error(error);
  }
}
init();
