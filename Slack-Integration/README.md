# Slack Integration #
Diese Slack Integration bildet die Gespräche aus Channels und aus direkt Nachrichten in einem Mail-Verkehr ab. Dieser Mail-Verkehr kann an eine weitere Mail-Adresse weitergeleitet werden.
Die Nachrichten werden in Echtzeit weitergeleitet.

## Anforderungen ##
* NodeJS Installation,
* Mail-Postfach für jeden Slack-Nutzer
* Jedes Postfach, muss vom selben Anbieter sein (bspw. GMail)
* Wenn ihr GMail verwendet, muss der Zugriff für unsichere Anwendungen aktivert werden. Teilweise wird sonst der Zugriff per SMTP verweigert.

## Installation ##
Ist NodeJS installiert und der Ordner aus dem Git geklont, reicht das Ausführen von folgendem Befehl
`npm install`

## Konfiguration ##
* Umbennung der Datei config/config.sample.js in config.config.js
* Einfügen der Zugangsdaten für die Nutzer
	* Die Slack-User-Id kann ausgelesen werden, wenn im Konfigurationsfile der Key 'token' mit einem Token gesetzt wird. Anschließend muss dieser Key wieder gelöscht werden.
	* Für jeden Nutzer muss ein eigener Slack-Api Token erzeugt werden (https://api.slack.com/docs/oauth-test-tokens)
	* Für jeden Nutzer müssen die Mail Zugangsdaten eingetragen werden

## Ausführen ##
Am einfachsten mit Hilfe von `node index.js` oder besser forever (https://github.com/foreverjs/forever) nutzen.