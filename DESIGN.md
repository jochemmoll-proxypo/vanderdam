# Website design

The public site uses the existing paper, forest-green ink and rust palette, with
editorial typography and open rows rather than a card grid. The CMS retains
Payload's own interface.

## Tokens and typography

- Paper: `#f4f1e9`; raised reading surface: `#faf8f3`.
- Primary ink: `#182d29`; secondary text: `#52635a`; accent: `#ac3b22`.
- Rules: `#c8cec3`. Rules separate content; shadows are not used.
- Figtree is used for navigation, controls and supporting information.
- Source Serif 4 is used for headlines and article text.
- Both fonts are subsetted, locally hosted WOFF2 files. Their OFL licenses live
  beside them in `assets/fonts/`. System fallbacks remain available.
- Display type scales with viewport width. Tracking never exceeds `-0.04em`.
- Article copy uses a maximum measure of 70ch and generous line spacing.

## Composition

The sticky header contains the wordmark, sport filter and primary navigation.
The edition date is separate from the navigation. On desktop the introduction
pairs the headline with supporting copy and an archive link. The feature retains
the date panel and story panel. Mobile collapses this into a horizontal date
strip followed by the story. Archive rows keep their date, title and sport visible
at every supported size. The about section and footer close the page.

## Interaction and accessibility

Sport filters remain synchronized with the URL and each other. Header filtering
scrolls to the archive. Scroll offsets follow the measured header height. A skip
link, visible keyboard focus, labelled native selects and minimum 44px control
heights support keyboard and touch use. Arrow icons use a consistent SVG stroke.

One brief headline entrance supplies motion; the content is visible by default.
Reduced-motion preferences disable smooth scrolling and transitions. Loading,
missing-story, failed-request and empty-category states share the same typography
and spacing system. Article text and long archive titles wrap without clipping.

## Implementation

`assets/style.css` owns the website's styles. `index.html` and
`app/(website)/page.tsx` contain equivalent page markup; update both together.
`scripts/prepare-assets.mjs` copies the shared assets for Next.js. No database
migration is required for visual changes.

## Review notes

Impeccable's detector identified the inherited cream-and-serif combination; it is
retained intentionally for continuity with the existing editorial identity. Small
mobile labels were raised to 12px. Reported rule-edge spacing was checked against
computed layout: the edition has 16px vertical padding, and the about section has
36px or more. Chromium verified sticky offsets, both filters, old renamed-category
links, empty categories, keyboard skipping, reduced motion and request failures.
