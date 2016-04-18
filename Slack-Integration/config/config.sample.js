
module.exports = {
    mailServer: {
        port: 465,
        host: 'smtp.gmail.com',
    },
    forwardTo: [
        'coinprojectX@gmail.com' // <- X ist Eure Nummer
    ],
    log: false,
    configToken: false, // Zur Konfiguration hier den Token eintragen.
    users: {
        U1830: { // <- Slack-User-Id, diesen Abschnitt für jeden Benutzer anlegen
            name: 'Tester Test', // <- Name-Eintragen
            token: '', // API-Token (https://api.slack.com/docs/oauth-test-tokens)
            isAdmin: true, // Es darf nur einen 'Admin' geben, dieser muss Mitglied in allen Channels sein
            mail: {
                auth: {
                    user: 'test@gmail.com', // Mail-Benutzername
                    pass: '' // Mail-Password
                }
            }
        }
    }
};