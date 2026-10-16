'use strict';
const tz = 'Europe/Amsterdam';
const now = new Date();
const dateKey = new Intl.DateTimeFormat('en-CA', {timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit'}).format(now);
const formatDate = value => new Intl.DateTimeFormat('nl-NL', {day: 'numeric', month: 'long', year: 'numeric', timeZone: tz}).format(new Date(`${value}T12:00:00Z`));
document.querySelector('#today').textContent = formatDate(dateKey).toUpperCase();
document.querySelector('#today').dateTime = dateKey;
document.querySelector('#day-number').textContent = dateKey.slice(-2);
document.querySelector('#month-name').textContent = new Intl.DateTimeFormat('nl-NL', {month: 'long', timeZone: tz}).format(now);
document.querySelector('#year').textContent = now.getFullYear();
function el(tag, text, cls) { const node = document.createElement(tag); if (text) node.textContent = text; if (cls) node.className = cls; return node; }
function empty(message) {
  const box = document.querySelector('#story');
  box.replaceChildren(el('p', 'VANDAAG IN DE SPORT', 'eyebrow'), el('h2', 'Het volgende hoofdstuk komt eraan.'), el('p', message));
}
function showStory(story) {
  const box = document.querySelector('#story');
  box.replaceChildren(el('p', `${story.sport} / ${story.event_date.slice(0, 4)}`, 'eyebrow'), el('h2', story.title), el('p', story.intro));
  const link = el('a', 'Lees het verhaal ↗', 'read-link'); link.href = '#article'; box.append(link);
  const article = document.querySelector('#article'); article.hidden = false;
  article.replaceChildren(el('p', `Gebeurd op ${formatDate(story.event_date)} · Gepubliceerd op ${formatDate(story.date)}`, 'meta'));
  story.paragraphs.forEach(p => article.append(el('p', p)));
  const sources = el('div', null, 'sources'); sources.append(el('strong', 'Bronnen & verantwoording'));
  const list = el('ul');
  story.sources.forEach(source => {
    const url = new URL(source.url); if (url.protocol !== 'https:') return;
    const item = el('li'); const a = el('a', source.title); a.href = url.href; a.target = '_blank'; a.rel = 'noopener noreferrer'; item.append(a); list.append(item);
  });
  sources.append(list, el('p', 'Met AI geresearcht en geschreven. De bronlinks maken het mogelijk om de feiten zelf te controleren.')); article.append(sources);
}
async function init() {
  try {
    const response = await fetch('stories/index.json', {cache: 'no-cache'}); if (!response.ok) throw new Error('Archief niet beschikbaar');
    const stories = (await response.json()).filter(s => s.date <= dateKey).sort((a,b) => b.date.localeCompare(a.date));
    const selected = new URLSearchParams(location.search).get('story') || dateKey;
    const story = stories.find(s => s.date === selected);
    if (story) {
      showStory(story);
      if (story.date !== dateKey) {
        document.querySelector('#day-number').textContent = story.date.slice(-2);
        document.querySelector('#month-name').textContent = new Intl.DateTimeFormat('nl-NL', {month: 'long', timeZone: tz}).format(new Date(`${story.date}T12:00:00Z`));
      }
    } else empty(selected === dateKey ? 'Hier verschijnt het sportverhaal van vandaag, zodra het onderzoek en de broncontrole zijn afgerond. Bekijk ondertussen het archief voor eerdere verhalen.' : 'Dit verhaal is niet beschikbaar. Kies een verhaal uit het archief.');
    const archive = document.querySelector('#archive-list'); archive.replaceChildren();
    if (!stories.length) archive.append(el('p', 'De eerste bladzijde moet nog worden geschreven. Gepubliceerde verhalen krijgen hier hun plek.', 'archive-empty'));
    stories.forEach(s => {
      const a = el('a', null, 'archive-row'); a.href = `?story=${encodeURIComponent(s.date)}#daily`;
      const time = el('time', formatDate(s.date)); time.dateTime = s.date; a.append(time, el('strong', s.title), el('span', `${s.sport} ↗`)); archive.append(a);
    });
  } catch (error) {
    empty('De verhalen konden niet worden geladen. Probeer de pagina later opnieuw te openen.');
    document.querySelector('#archive-list').replaceChildren(el('p', 'Het archief is tijdelijk niet beschikbaar.', 'archive-empty'));
    console.error(error);
  }
}
init();
