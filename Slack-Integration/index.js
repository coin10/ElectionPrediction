var _ = require('lodash'),
    RtmClient = require('@slack/client').RtmClient,
    CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS,
    RTM_EVENTS = require('@slack/client').RTM_EVENTS,
    nodemailer = require('nodemailer'),
    
    Config = require('./config/config'),
    User = Config.users,
    Channels = [],
    DirectChannels = {};

if (Config.configToken) {
    var client = new RtmClient(Config.configToken);
    client.on(CLIENT_EVENTS.RTM.AUTHENTICATED, function (rtmStartData) {
        rtmStartData.users.forEach(function (user) {
            if (!User[user.id]) console.log('Missing user parameters for: \n\tid: ' + user.id + '\n\tname: ' + user.name + '\n');
        });
        process.exit();
    });
    client.start();
    return;
}

Object.keys(User).forEach(function (userKey) {
    if (User[userKey].token === undefined) return;
    var client = new RtmClient(User[userKey].token);

    client.on(CLIENT_EVENTS.RTM.AUTHENTICATED, function (rtmStartData) {
        rtmStartData.users.forEach(function (userId) {
            if (!User[userId.id]) console.log('Missing user parameters from: \n ' + JSON.stringify(userId) + '\n');
        });

        if (User[userKey].isAdmin) {
            rtmStartData.channels.forEach(function (channel) {
                if (!channel.members) return console.error('Channel ' + channel.name + ' without members');

                Channels[channel.id] = channel;

                Channels[channel.id].members = Channels[channel.id].members.map(function (member) {
                    return _.merge({id: member}, User[member]);
                });
            });
        }

        rtmStartData.ims.forEach(function (channel) {
            if (User[channel.user] && DirectChannels[channel.id] === undefined) {
                DirectChannels[channel.id] = [
                    _.merge({id: userKey }, User[userKey]),
                    _.merge({id: channel.user }, User[channel.user])
                ];
            }
        });
    });

    client.on(RTM_EVENTS.MESSAGE, function (message) {
        var mail = undefined;
        if (User[userKey].isAdmin && User[message.user] && Channels[message.channel]) {
            if (Channels[message.channel].name === 'random') return console.info('Skip random message');

            mail = {
                from: '"' + User[message.user].name + '" <' + User[message.user].mail.auth.user + '>',
                to: Channels[message.channel].members.filter(function (member) {
                    return member.id !== message.user;
                }).map(function (member) {
                    return member.mail.auth.user;
                }),
                cc: Config.forwardTo,
                subject: 'Neue Nachricht geschrieben in: ' + Channels[message.channel].name,
                text: message.text
            };
        } else if (DirectChannels[message.channel]) {
            var receiver = DirectChannels[message.channel].filter(function (user) {
                return user.id !== message.user
            })[0];
            if (receiver.id === userKey) return;

            mail = {
                from: '"' + User[message.user].name + '" <' + User[message.user].mail.auth.user + '>',
                to: [ receiver.mail.auth.user ],
                cc: Config.forwardTo,
                subject: 'Direct Message von: ' + User[message.user].name,
                text: message.text
            };
        }

        if (mail) {
            if (!User[message.user].transporter) User[message.user].transporter = nodemailer.createTransport(_.merge(User[message.user].mail, Config.mailServer));
            
            User[message.user].transporter.sendMail(mail, function (err, info) {
                if (err) return console.error(err);
                if (Config.log) console.info(new Date() + ': ' + mail.subject);
            });
        }
    });

    client.start();
});

