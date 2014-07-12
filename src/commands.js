module.exports = function(client, clientInfo, logUI, usersUI, channelsUI)
{
  var Log = require('./log.js');

  function getSave()
  {
    if (!window.localStorage['relay-save'])
      window.localStorage['relay-save'] = JSON.stringify(
      {});
    return JSON.parse(window.localStorage['relay-save']);
  }

  function setSave(save)
  {
    window.localStorage['relay-save'] = JSON.stringify(save);
  }

  var commands = {};
  commands.connect = function(server, port)
  {
    try
    {
      client = new irc.Client(server, clientInfo.nick,
      {
        port: port || 6667
      });
    }
    catch (e)
    {
      clientInfo.addLog(new Log('error', JSON.stringify(e)));
    }
    clientInfo.currentServer = server;
    clientInfo.currentPort = port || 6667;
  };
  commands.server = commands.connect;

  commands.disconnect = function(message)
  {
    client.disconnect(message, function()
    {
      while (clientInfo.channels.length > 1)
        clientInfo.channels.pop();
      clientInfo.currentChannel = defaultChannel;
      channelsUI.update();
      logUI.update();
      usersUI.update();
      clientInfo.addLog(new Log('app', 'disconnected'));
    });
  };
  commands.dc = commands.disconnect;
  commands.quit = commands.disconnect;

  commands.message = function(to, text)
  {
    client.say(to, text);
  };
  commands.msg = commands.message;
  commands.pm = commands.message;

  commands.join = function(channel)
  {
    client.join(channel);
  };

  commands.part = function(channel, message)
  {
    if (!channel)
      client.part(clientInfo.currentChannel.name, message);
    else
      client.part(channel, message);
  };

  commands.nick = function(nick)
  {
    if (nick)
    {
      client.send('NICK', nick);

      // We can change our nick with no confirmation in default channel
      if (clientInfo.currentChannel === clientInfo.channels[0])
      {
        clientInfo.nick = nick;
        clientInfo.addLog(new Log('app', 'Set nick to ' + nick));
        var save = getSave();
        save.nick = nick;
        setSave(save);
      }
    }
    else
    {
      clientInfo.addLog(new Log('app', clientInfo.nick));
    }
  };

  commands.clear = function()
  {
    clientInfo.currentChannel.logs = [];
    logUI.update();
  };
  commands.cls = commands.clear;

  return commands;
}