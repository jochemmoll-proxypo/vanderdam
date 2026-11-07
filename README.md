# This Day in Sports

Engelstalige sportgeschiedenis op de kalenderdatum waarop het gebeurde.
Statische website, zonder frontend-dependencies, geschikt voor GitHub Pages.

## Lokaal ontwikkelen

Gebruik de bestaande checkout; een aparte Git-worktree is niet nodig.
Vanuit de repository: `python3 -m http.server 8000`. Open de site via die server.
Er zijn geen installatie- of buildstappen. Verhalen staan in `stories/index.json`.
De kalender gebruikt Europe/Amsterdam, onafhankelijk van de tijdzone van de bezoeker.

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
