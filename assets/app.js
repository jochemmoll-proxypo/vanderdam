'use strict';
const masthead = document.querySelector('.masthead');
new ResizeObserver(() => {
  document.documentElement.style.setProperty('--header-height', `${masthead.getBoundingClientRect().height}px`);
}).observe(masthead);
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
function arrowIcon() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', 'M5 12h14M13 6l6 6-6 6');
  svg.append(path); return svg;
}
function empty(message) {
  const box = document.querySelector('#story');
  box.replaceChildren(el('h2', 'The next chapter is on its way.'), el('p', message));
  const link = el('a', 'Explore the archive', 'read-link'); link.href = '#archive'; link.append(arrowIcon()); box.append(link);
}
function showStory(story) {
  document.querySelector('.story-header-image')?.remove();
  if (story.headerImage) {
    const photo = story.headerImage;
    const safeImageURL = value => {
      try {
        const url = new URL(value, location.href);
        return url.protocol === 'https:' || (url.protocol === 'http:' && url.origin === location.origin) ? url.href : null;
      } catch { return null; }
    };
    const src = safeImageURL(photo.url);
    if (src) {
      const figure = el('figure', null, 'story-header-image');
      const image = document.createElement('img'); image.alt = photo.alt || '';
      image.decoding = 'async'; image.fetchPriority = 'high';
      if (photo.width > 0 && photo.height > 0) { image.width = photo.width; image.height = photo.height; }
      image.style.objectPosition = `${Number.isFinite(photo.focalX) ? photo.focalX : 50}% ${Number.isFinite(photo.focalY) ? photo.focalY : 50}%`;
      const smallSrc = photo.smallUrl && safeImageURL(photo.smallUrl);
      if (smallSrc && photo.smallWidth > 0 && photo.width > photo.smallWidth) { image.srcset = `${smallSrc} ${photo.smallWidth}w, ${src} ${photo.width}w`; image.sizes = '(max-width: 700px) calc(100vw - 40px), (max-width: 1344px) 90vw, 1200px'; }
      image.addEventListener('error', () => figure.remove(), { once: true });
      figure.append(image);
      if (photo.caption || photo.credit) {
        const caption = el('figcaption');
        if (photo.caption) caption.append(el('span', photo.caption));
        if (photo.credit) caption.append(el('span', photo.credit, 'image-credit'));
        figure.append(caption);
      }
      document.querySelector('#daily').after(figure);
      image.src = src;
    }
  }
  const box = document.querySelector('#story');
  box.replaceChildren(el('h2', story.title), el('p', `${story.sport} · ${story.event_date.slice(0, 4)}`, 'story-meta'), el('p', story.intro));
  const link = el('a', 'Read the story', 'read-link'); link.href = '#article'; link.append(arrowIcon()); box.append(link);
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
    const categoriesRequest = fetch('sports/index.json', {cache: 'no-cache'})
      .then(response => response.ok ? response.json() : []).catch(() => []);
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
    const archive = document.querySelector('#archive-list');
    const filters = [...document.querySelectorAll('#sport-filter, #header-sport-filter')];
    const count = document.querySelector('#archive-count');
    const sportKey = value => value.trim().toLocaleLowerCase('en');
    const sports = new Map();
    const aliases = new Map();
    const categories = await categoriesRequest;
    if (Array.isArray(categories)) categories.forEach(category => {
      if (typeof category.name !== 'string' || !category.name.trim()) return;
      const key = sportKey(category.name);
      sports.set(key, category.name.trim());
      if (typeof category.archiveLabel === 'string') aliases.set(sportKey(category.archiveLabel), key);
    });
    stories.forEach(s => {
      const label = s.sport.trim();
      if (label && !sports.has(sportKey(label))) sports.set(sportKey(label), label);
    });
    [...sports].sort((a, b) => a[1].localeCompare(b[1], 'en')).forEach(([key, label]) => {
      filters.forEach(filter => {
        const option = el('option', label); option.value = key; filter.append(option);
      });
    });
    const renderArchive = () => {
      const selectedSport = new URLSearchParams(location.search).get('sport') || '';
      const requestedKey = aliases.get(sportKey(selectedSport)) || sportKey(selectedSport);
      const key = sports.has(requestedKey) ? requestedKey : '';
      filters.forEach(filter => { filter.value = key; });
      const visible = key ? stories.filter(s => sportKey(s.sport) === key) : stories;
      archive.replaceChildren();
      count.textContent = `${visible.length} ${visible.length === 1 ? 'story' : 'stories'}${key ? ` in ${sports.get(key) || selectedSport}` : ' across all sports'}`;
      if (!visible.length) archive.append(el('p', key ? 'No stories for this sport yet. Choose All sports to explore the archive.' : 'The first page is still waiting to be written. Published stories will find their home here.', 'archive-empty'));
      visible.forEach(s => {
        const params = new URLSearchParams(); params.set('story', s.date);
        if (key) params.set('sport', key);
        const a = el('a', null, 'archive-row'); a.href = `?${params}#daily`;
        const time = el('time', formatDate(s.date)); time.dateTime = s.date;
        const sport = el('span', s.sport, 'archive-sport'); sport.append(arrowIcon());
        a.append(time, el('strong', s.title), sport); archive.append(a);
      });
    };
    filters.forEach(filter => filter.addEventListener('change', () => {
      const url = new URL(location.href);
      if (filter.value) url.searchParams.set('sport', filter.value);
      else url.searchParams.delete('sport');
      if (filter.id === 'header-sport-filter') url.hash = 'archive';
      history.pushState(null, '', url);
      renderArchive();
      if (filter.id === 'header-sport-filter') document.querySelector('#archive').scrollIntoView();
    }));
    window.addEventListener('popstate', renderArchive);
    document.querySelector('#archive-controls').hidden = false;
    document.querySelector('#header-sport-control').hidden = false;
    renderArchive();
  } catch (error) {
    empty('The stories could not be loaded. Please try again later.');
    document.querySelector('#archive-list').replaceChildren(el('p', 'The archive is temporarily unavailable.', 'archive-empty'));
    console.error(error);
  }
}
init();
