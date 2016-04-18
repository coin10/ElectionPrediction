var _ = require('lodash'),
    RtmClient = require('@slack/client').RtmClient,
    CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS,
    RTM_EVENTS = require('@slack/client').RTM_EVENTS,
    nodemailer = require('nodemailer'),
    
    Config = require('./config/config'),
    User = require('./config/users');

var token = process.env.SLACK_API_TOKEN || 'xoxp-34010547958-34038926102-34418474055-cf42351da6',
    channels = {};

var rtm = new RtmClient(token);

rtm.on(CLIENT_EVENTS.RTM.AUTHENTICATED, function (rtmStartData) {
    rtmStartData.channels.forEach(function (channel) {
        if (!channel.members) return console.error('Channel ' + channel.name + ' without members');

        channels[channel.id] = channel;

        channels[channel.id].members = channels[channel.id].members.map(function (member) {
            return _.merge({ id: member}, User[member]);
        });
    });
});

rtm.on(RTM_EVENTS.MESSAGE, function (message) {
    var mail = undefined;
    if (User[message.user] && channels[message.channel]) {
        if (channels[message.channel].name === 'random') return console.info('Skip random message');

        mail = {
            from: '"' + User[message.user].name + '" <' + User[message.user].mail.auth.user + '>',
            to: channels[message.channel].members.filter(function (member) {
                return member.id !== message.user;
            }).map(function (member) {
                return member.mail.auth.user;
            }),
            cc: Config.forwardTo,
            subject: 'Neue Nachricht geschrieben in: ' + channels[message.channel].name,
            text: message.text
        };
    }

    if (mail) {
        if (!User[message.user].transporter) User[message.user].transporter = nodemailer.createTransport(_.merge(User[message.user].mail, Config.gmail));

        User[message.user].transporter.sendMail(mail, function (err, info) {
            if (err) return console.error(err);
            console.info('Message sent: ' + info.response);
        });
    }
});

rtm.start();

