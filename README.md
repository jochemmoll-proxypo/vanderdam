# This Day in Sports

Nederlandstalige sportgeschiedenis op de kalenderdatum waarop het gebeurde.
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
verifieert feiten aan meerdere bronnen en schrijft een origineel Nederlands verhaal.
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
