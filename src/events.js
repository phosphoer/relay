module.exports = function(appModel)
{
  var Channel = require('./channel');
  var User = require('./user');

  var events = {};
  events.registered = function()
  {
    appModel.resetChannels();

    appModel.addLog('server', 'connected');
    appModel.connected = true;

    var save = appModel.getSave();
    if (!save.servers)
      save.servers = {};
    save.servers[appModel.currentServer] = appModel.currentPort;

    appModel.setSave(save);
  };

  events.names = function(channel, nicks)
  {
    var chan = appModel.getChannel(channel);

    if (!chan)
      return;

    chan.users = [];
    for (var nick in nicks)
      chan.users.push(new User(nick));
    appModel.usersUI.update();
  };

  events.message = function(from, to, text)
  {
    // Get the channel this was to
    var chan = appModel.getChannel(to);
    if (chan)
    {
      chan.addLog(from, text);
    }
    // If no channel, it may have been a pm to us
    else if (to === appModel.nick)
    {
      appModel.addLog('private ' + from, text);
    }
  };

  events.join = function(channel, nick)
  {
    appModel.addLog('server', nick + ' has joined ' + channel);

    if (nick === appModel.nick)
    {
      var chan = new Channel(channel, appModel);
      appModel.channels.push(chan);
      appModel.currentChannel = chan;
      appModel.logUI.update();
    }
    else
    {
      var chan = appModel.getChannel(channel);
      chan.users.push(new User(nick));
    }

    appModel.usersUI.update();
  };

  events.part = function(channel, nick, reason)
  {
    appModel.addLog('server', nick + ' has left ' + channel + ' (' + reason + ')');

    if (nick === appModel.nick)
    {
      for (var i = 0; i < appModel.channels.length; ++i)
      {
        if (appModel.channels[i].name === channel)
        {
          appModel.channels.splice(i, 1);
          appModel.currentChannel = appModel.channels[i] || appModel.channels[i - 1];
          appModel.logUI.update();
          break;
        }
      }
    }
    else
    {
      var chan = appModel.getChannel(channel);
      var user = chan.getUser(nick);
      var index = chan.users.indexOf(user);
      chan.users.splice(index, 1);
    }

    appModel.usersUI.update();
  };

  // This seems to be redundant with the message event?
  // events.pm = function(from, text)
  // {
  //   appModel.addLog(new Log('PM ' + from, text));
  // };

  events.nick = function(oldNick, newNick, channels)
  {
    for (var i = 0; i < channels.length; ++i)
    {
      var chan = appModel.getChannel(channels[i]);
      if (chan)
      {
        var user = chan.getUser(oldNick);
        user.name = newNick;
      }
    }

    appModel.addLog('server', oldNick + ' is now known as ' + newNick);

    if (oldNick === appModel.nick)
    {
      appModel.nick = newNick;

      var save = appModel.getSave();
      save.nick = appModel.nick;
      appModel.setSave(save);
    }

    appModel.usersUI.update();
  };

  events.quit = function(nick, reason, channels)
  {
    for (var i = 0; i < channels.length; ++i)
    {
      var chan = appModel.getChannel(channels[i]);
      if (chan)
      {
        var user = chan.getUser(nick);
        var index = chan.users.indexOf(user);
        chan.users.splice(index, 1);
      }
    }
  };

  events.raw = function(message)
  {
    console.log(message);

    if (message.command === 'rpl_motdstart')
    {
      appModel.addLog('server', message.args[1]);
    }
    else if (message.command === 'rpl_motd')
    {
      appModel.addLog('server', message.args[1]);
    }
    else if (message.command === 'err_nicknameinuse')
    {
      appModel.addLog('error', 'That nickname is already in use, please choose another');
    }
    else if (message.command === 'err_erroneusnickname')
    {
      appModel.addLog('error', 'That nickname is invalid, please choose another');
    }
  };

  events.error = function(message)
  {
    console.log('error: ' + JSON.stringify(message));
  };

  return events;
};