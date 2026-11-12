# This Day in Sports

Engelstalige sportgeschiedenis op de kalenderdatum waarop het gebeurde.
Next.js met Payload CMS 3 en PostgreSQL, bedoeld voor Vercel. De bestaande
Engelse website, vormgeving en het JSON-archief blijven behouden. CMS-verhalen
worden op publicatiedatum aan het archief toegevoegd; een gepubliceerd CMS-verhaal
met dezelfde datum krijgt voorrang. Concepten en toekomstige CMS-verhalen zijn
niet openbaar. Bestaande Python-research en de afzonderlijke canonical-monitor
blijven werken.

## Lokaal ontwikkelen

1. Gebruik Node.js 22 of nieuwer en `npm ci`.
2. Kopieer `.env.example` naar `.env` en configureer `DATABASE_URL` met de
   Neon-verbindingsstring en TLS (`sslmode=require`). `POSTGRES_URL` wordt als
   alternatief ondersteund. Gebruik een aparte ontwikkelbranch in Neon.
3. Stel `PAYLOAD_SECRET` in op een lange willekeurige waarde, bijvoorbeeld uit
   `openssl rand -hex 32`. Bewaar deze waarde stabiel en uitsluitend als secret.
4. Voer `npm run migrate` uit, daarna `npm run dev`.
5. Open `/admin` en maak de eerste beheerder aan. Doe dit direct na deployment;
   daarna vereisen gebruikersbeheer en schrijven een ingelogde beheerder.

## Vercel en Neon

Koppel dit project aan deze repository met framework **Next.js**, project-root
`.` en buildcommand `npm run build`. Verwijder eventuele oude static-site
build/output-overrides. Gebruik Node.js 22 of 24.

Stel in Vercel de volgende omgevingsvariabelen in:

- `DATABASE_URL`: de bestaande Neon PostgreSQL URL met TLS, als secret.
- `PAYLOAD_SECRET`: een lange willekeurige waarde, als secret.
- `NEXT_PUBLIC_SERVER_URL`: `https://vanderdam.vercel.app` voor productie.

Controleer welke Neon-branch bij Production hoort. Gebruik voor Preview en lokale
ontwikkeling een aparte Neon-branch en een eigen server-URL; gebruik daar geen
productiedatabase. Payload schema-push is uitgeschakeld, zodat een ontwikkelserver
de database niet automatisch wijzigt.

Voer de gecommitte migraties met `npm run migrate` uit tegen de bedoelde database
vóór de deployment. Voer daarna `npm run import:stories` uit om bestaande verhalen
ook in het CMS bewerkbaar te maken. Deze import slaat bestaande CMS-datums over
en kan veilig opnieuw draaien. De build zelf wijzigt geen databases. Controleer na deployment
`/`, `/stories/index.json`, `/admin` en ongeautoriseerde toegang tot `/api/users`.
Richt de eerste beheerder direct in. Dit project biedt tekstbeheer en bronlinks;
het gebruikt geen tijdelijke Vercel-schijf voor bestandsuploads. Er is nog geen
mailprovider geconfigureerd; stel een Payload-emailadapter in voordat je
wachtwoordherstel per e-mail wilt gebruiken.

`npm run typecheck`, `npm run build` en
`python3 -m unittest discover -s tests -v` controleren de applicatie en de
bestaande automatiseringen. `index.html`, `assets/` en `stories/` blijven tevens
beschikbaar voor de bestaande GitHub Pages-publicatie.

## Publiceren en dagelijkse research activeren

1. Kies bij GitHub **Settings > Pages > Source: GitHub Actions**.
2. Voeg bij **Settings > Secrets and variables > Actions > New repository secret**
   een secret `OPENAI_API_KEY` toe, met een eigen OpenAI API-sleutel.
   Plak de sleutel nooit in code, issues of chat. De API moet toegang hebben tot
   `gpt-5-mini`, Responses API en web search; API-gebruik brengt kosten met zich mee.
3. Start onder **Actions > Website publiceren > Run workflow** de eerste deployment.
4. Start **Actions > Dagelijks sportverhaal > Run workflow** om het eerste verhaal
   te laten onderzoeken en publiceren. Controleer die eerste run en de bronlinks.

De researchworkflow draait dagelijks om 05:15 UTC en nogmaals om 07:15 UTC als
herkansing. Bestaande verhalen voor vandaag worden niet opnieuw gegenereerd.
GitHub kan geplande runs vertragen; een exacte publicatietijd is niet gegarandeerd.
GitHub kan schedules bij langdurige inactiviteit uitschakelen. Bij fouten blijft het
bestaande archief intact. Bekijk mislukte runs in Actions en activeer e-mailmeldingen.
Branchbeveiliging moet commits van deze workflow toestaan; anders is een PR-flow nodig.

Na research commit de workflow het verhaal en roept expliciet de Pages-workflow aan:
commits met GITHUB_TOKEN starten zelf geen andere push-workflows.

## Redactionele aanpak

De AI zoekt een sportprestatie op precies dezelfde dag en maand in een eerder jaar,
verifieert feiten aan meerdere bronnen en schrijft een origineel Engels verhaal.
De publicatiecontrole vereist twee verschillende brondomeinen, URL's uit de daadwerkelijke
webresearch, een geldige historische datum en een volledig verhaal. Dit is geen garantie
op foutloze feiten; het blijft AI-research zonder menselijke eindredactie. De site
vermeldt dat expliciet. Lees bronnen na, vooral bij gevoelige of betwiste gebeurtenissen.
Een onvoltooide of geweigerde researchrun publiceert niets. Er zijn bewust nog geen
verhalen opgenomen die hier niet met internetresearch konden worden gecontroleerd.

Handmatig uitvoeren: zet `OPENAI_API_KEY` veilig in de procesomgeving en voer
`python3 scripts/publish_daily.py` uit. Optioneel `SPORTS_MODEL` voor een ander model
met ondersteuning voor web search en structured outputs.

## Controle

`python3 -m unittest discover -s tests -v`

`node --check assets/app.js`

## Sportnieuws canonical monitor

The **Sportnieuws canonical monitor** workflow runs hourly at minute 23 (UTC),
with an additional manual **Run workflow** option. GitHub schedules may be delayed
and can be disabled after prolonged repository inactivity.

It reads the Sportnieuws Google News sitemap and checks only newly published
article URLs (`/nieuws/`) from the start time in
`monitoring/sportnieuws-state.json`. Existing articles and later edits to already
checked articles are skipped. The homepage is not monitored. The monitor reads
server-returned HTML; it does not execute JavaScript. A missing canonical tag or a
missing, empty or whitespace-only canonical href triggers a second fetch to
confirm, then one email per run listing the affected articles.

Alert recipients: **Jochem.moll@persgroep.net** and **rhian.ket@persgroep.net**.
Healthy articles cause no email. Failed article requests stay queued for retry;
HTTP errors are not reported as empty canonicals. Alerts are marked complete only
after SMTP accepts them; SMTP failure causes retries. If SMTP accepts an email but
the subsequent state commit fails, a later run may repeat the alert. The news
sitemap has a limited retention window, so long outages may leave a coverage gap.
Workflow failures appear in GitHub Actions and should be investigated.

### Configure email delivery

Add these five repository secrets under **Settings > Secrets and variables >
Actions** (never put credentials in source code or chat):

| Secret | Value |
| --- | --- |
| `SMTP_HOST` | Your SMTP provider's hostname |
| `SMTP_PORT` | `465` for implicit TLS or `587` for STARTTLS |
| `SMTP_USERNAME` | SMTP login |
| `SMTP_PASSWORD` | SMTP password or provider app password |
| `SMTP_FROM` | A sender address authorized by your SMTP provider |

The workflow deliberately fails before changing its progress state if any SMTP
setting is missing. Once secrets are added, manually run **Sportnieuws canonical
monitor** and inspect the result. This verifies fetching and state saving; a
healthy run sends no email. To verify SMTP delivery, manually run the workflow
with **test_email** selected; it sends a clearly labeled test to both recipients
without changing monitoring state, then runs the normal check. Scheduled runs
never send test emails.

Local check without sending email or changing state:
`python3 scripts/check_canonicals.py --dry-run`.

If email setup takes more than a couple of days, update `started_at` in the state
file to the activation time to make the intended coverage start explicit.

## Sport categories in the CMS

Open `/admin` and choose **Sport categories** to add or rename a sport. In
**Stories**, use the **Sport** picker to assign a category. Both website dropdowns
read these categories, including categories without stories. Renaming a sport
updates its website label without breaking story assignments; existing archive
labels and old sport-filter links continue to resolve. Categories referenced by
stories, saved versions or the static archive cannot be deleted. Unused categories
can be deleted. Category writes require an authenticated administrator.

Before deploying this change, run `npm run migrate` against the intended database.
The sport-category migration seeds existing sports and assigns both stories and
saved versions. It retains the legacy sport text for compatibility with the
existing daily archive. `npm run import:stories` resolves legacy sport labels to
categories and creates a category for an unseen sport. GitHub Pages continues to
derive sports from its static archive; CMS category edits apply to the Next.js site.

Run `npm run test:categories` for migration and Payload integration checks. It uses
a disposable local PostgreSQL-compatible PGlite database and never the configured
production database.

For a preview with its own database, set branch-specific Preview variables
`DATABASE_URL`, `NEXT_PUBLIC_SERVER_URL`, `PREVIEW_MIGRATIONS=true` and
`PREVIEW_DATABASE_HOST` (the exact isolated database hostname). Vercel then runs
pending migrations before the preview build. A hostname mismatch stops the build.
Production builds never run this preview migration step.

## Story header images

In `/admin`, edit a story and use **Header image** to upload or choose an image.
The **Images** collection stores required alt text and optional captions and photo
credits. Publish the story to display its image below the story feature on the
Next.js site. Stories without an image retain their existing layout.

JPEG, PNG, WebP and AVIF uploads up to 3 MB are supported. Images are converted
to WebP, resized to fit within 2400 × 1600, and receive an 800px variant when large
enough. Set the focal point in the image editor to control the website crop.
Referenced images cannot be deleted while stories or saved versions use them.

Before deploying, connect a **public Vercel Blob** store to the project and ensure
`BLOB_READ_WRITE_TOKEN` is configured as a sensitive environment variable. Use
a separate store/token for Preview so preview edits cannot remove production
assets. Apply `npm run migrate` to the intended database before deployment.
Storage fields are present regardless of whether the token is configured, so
migrations and generated types do not depend on storage credentials.

On Vercel, local disk storage is disabled. Uploads return a configuration error
when the Blob token is missing. Local development without a token uses the
gitignored `.local-media/` directory; `LOCAL_MEDIA_DIR` can select a different
local directory. Keep local media out of production deployments.

`npm run test:categories` includes header-image integration checks against a
disposable local database and temporary image directory. It never uploads to
Blob. Existing GitHub Pages publication still reads its original JSON archive;
CMS uploads are displayed by the Next.js website.

### Larger image viewer and Google image previews

Click the story image, or focus it and press Enter, to open its larger source in a
modal. Escape, Close and clicking outside the modal close it and restore focus.
The background stays fixed while the modal is open.

New uploads must be at least 1200 × 800 pixels. Payload produces a distinct
1200 × 800 WebP header crop and retains a larger source (up to 2400 × 1600) for
the viewer. The header's actual file and intrinsic dimensions are 1200 × 800 on
all viewports. Focal points determine the crop. Story pages provide server-rendered
Open Graph image metadata and `max-image-preview:large` for Google. These settings
do not guarantee inclusion in Discover.

Apply the included discover-image migration. For existing Blob images, run
`npm run regenerate:images` against the intended database and matching Blob store.
It skips already-generated variants and reports sources that need larger
replacements. On an isolated preview with migrations enabled, setting the
branch-specific `PREVIEW_REGENERATE_IMAGES=true` runs this idempotent step before
building. Production builds do not regenerate images automatically.
