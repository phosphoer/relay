var irc = require('irc');
var gui = require('nw.gui');
var client = new irc.Client('', 'unnamed-user');

//
// Some classes
//
var User = function(name)
{
  this.name = name;
};

var Log = function(sender, message)
{
  this.sender = sender || 'no one';
  this.message = message || 'nooothinnnggg';
  this.imgSrc = '';
  this.imgDisplay = 'none';
  this.linkHref = '';
  this.linkDisplay = 'none';
  this.ircLink = '';
  this.isIrcLink = false;

  // Detect a message with a link
  var match = message.match(/((http:.+)|(https:.+))/);
  if (match && match.index >= 0)
  {
    var url = match[1];

    if (/(.png|.gif|.jpg|.jpeg)$/.test(url))
    {
      this.imgSrc = url;
      this.imgDisplay = '';
      this.message = this.message.replace(url, '');
    }
    else
    {
      this.linkHref = url;
      this.linkDisplay = '';
      this.message = this.message.replace(url, '');
    }
  }

  // Detect a message with an irc server link
  match = message.match(/(irc.+)/);
  if (match && match.index >= 0)
  {
    var url = match[1];
    this.ircLink = url;
    this.isIrcLink = true;
  }

  this.activate = function(e)
  {
    if (!clientInfo.connected && this.isIrcLink)
    {
      if (e.original.button === 2)
      {
        var save = JSON.parse(localStorage['relay-save']);
        delete save.servers[this.message];
        localStorage['relay-save'] = JSON.stringify(save);
        clientInfo.currentChannel.logs.splice(clientInfo.currentChannel.logs.indexOf(this), 1);
      }
      else
      {
        commands.connect(this.ircLink);
      }
    }
  };
};

var Channel = function(name)
{
  this.name = name || 'channel';
  this.logs = [];
  this.users = [];

  this.activate = function()
  {
    clientInfo.currentChannel = this;
    logUI.update();
  };

  this.getUser = function(name)
  {
    for (var i = 0; i < this.users.length; ++i)
      if (this.users[i].name === name)
        return this.users[i];
  };
};

// The default 'channel'
var defaultChannel = new Channel('default');

//
// Main app model
//
var clientInfo =
{
  nick: 'relay-user-1',
  userName: 'unnamed-user',
  channels: [defaultChannel],
  currentChannel: defaultChannel,

  getChannel: function(name)
  {
    for (var i = 0; i < this.channels.length; ++i)
      if (this.channels[i].name === name)
        return this.channels[i];
  },

  addLog: function(log)
  {
    this.currentChannel.logs.push(log);
    var logWin = document.querySelector(".log-window");
    logWin.scrollTop = logWin.scrollHeight;
  }
};

var channelsUI = null;
var usersUI = null;
var logUI = null;

//
// Woo main!
//
function main()
{
  // Save info
  var save = localStorage['relay-save'];
  if (!save)
    localStorage['relay-save'] = JSON.stringify({});

  // Handle opening links in a new browser
  var win = gui.Window.get();
  win.on('new-win-policy', function(frame, url, policy)
  {
    if (url.indexOf("http") >= 0)
    {
      policy.ignore();
      gui.Shell.openExternal(url);
    }
  });

  // Build channels window
  channelsUI = new Ractive(
  {
    el: 'channelContainer',
    template: '#channelsTemplate',
    data: {user: clientInfo}
  });
  channelsUI.on('activate', function(e)
  {
    e.context.activate();
  });

  // Build user window
  usersUI = new Ractive(
  {
    el: 'usersContainer',
    template: '#usersTemplate',
    data: {user: clientInfo}
  });

  // Build log window
  logUI = new Ractive(
  {
    el: 'logContainer',
    template: '#logTemplate',
    data: {user: clientInfo}
  });
  logUI.on('activate', function(e)
  {
    e.context.activate(e);
  });

  // Default message
  clientInfo.addLog(new Log('app', 'Welcome to Relay!'));

  // Show recent servers
  save = JSON.parse(localStorage['relay-save']);
  if (save.servers)
  {
    clientInfo.addLog(new Log('app', 'Recent servers...'));
    for (var i in save.servers)
    {
      clientInfo.addLog(new Log('app', i));

      // Force log to be an IRC link
      defaultChannel.logs[defaultChannel.logs.length - 1].isIrcLink = true;
      defaultChannel.logs[defaultChannel.logs.length - 1].ircLink = i;
    }
  }

  var input = document.querySelector('.user-input');
  input.addEventListener('keydown', function(e)
  {
    // Hit enter on the keyboard
    if (e.keyCode === 13)
    {
      var command = input.value;
      input.value = '';

      // Try parsing input as a command, otherwise send it as a
      // message
      if (!parseCommand(command))
        sendMessage(command);
    }
  });
}

function sendMessage(message)
{
  clientInfo.addLog(new Log(clientInfo.nick, message));
  commands.message(clientInfo.currentChannel.name, message);
}

function parseCommand(message)
{
  if (message[0] !== '/' && message[0] !== '\\')
    return false;

  var isCommand = true;
  var parts = message.split(' ');
  var command = parts[0].slice(1);
  var args = parts.slice(1);

  if (command in commands)
  {
    commands[command].apply(commands, args);
  }
  else
  {
    isCommand = false;
  }

  if (isCommand)
    clientInfo.addLog(new Log('>', message));

  return isCommand;
}

function setupListeners()
{
  for (var i in messages)
    client.addListener(i, messages[i]);
}

//
// Messages
//
var messages = {};
messages.registered = function()
{
  var log = new Log('server', 'connected');
  clientInfo.addLog(log);
  clientInfo.connected = true;

  var save = JSON.parse(localStorage['relay-save']);
  if (!save.servers)
    save.servers = {};
  save.servers[clientInfo.currentServer] = true;

  localStorage['relay-save'] = JSON.stringify(save);
};

messages.motd = function(motd)
{
  var log = new Log('server', motd);
  clientInfo.addLog(log);
};

messages.names = function(channel, nicks)
{
  var chan = clientInfo.getChannel(channel);

  if (!chan)
    return;

  chan.users = [];
  for (var nick in nicks)
    chan.users.push(new User(nick));
  usersUI.update();
};

messages.message = function(from, to, text)
{
  var log = new Log(from + ' > ' + to, text);
  if (to === clientInfo.currentChannel.name)
    log = new Log(from, text);
  clientInfo.addLog(log);
};

messages.join = function(channel, nick)
{
  var log = new Log('server', nick + ' has joined ' + channel);
  clientInfo.addLog(log);

  if (nick === clientInfo.nick)
  {
    var chan = new Channel(channel);
    clientInfo.channels.push(chan);
    clientInfo.currentChannel = chan;
    logUI.update();
  }
  else
  {
    var chan = clientInfo.getChannel(channel);
    chan.users.push(new User(nick));
  }

  usersUI.update();
};

messages.part = function(channel, nick, reason)
{
  var log = new Log('server', nick + ' has left ' + channel + ' (' + reason + ')');
  clientInfo.addLog(log);

  if (nick === clientInfo.nick)
  {
    for (var i = 0; i < clientInfo.channels.length; ++i)
    {
      if (clientInfo.channels[i].name === channel)
      {
        clientInfo.channels.splice(i, 1);
        clientInfo.currentChannel = clientInfo.channels[i] || clientInfo.channels[i - 1];
        logUI.update();
        break;
      }
    }
  }
  else
  {
    var chan = clientInfo.getChannel(channel);
    for (var i = 0; i < chan.users.length; ++i)
    {
      if (chan.users[i].name === nick)
      {
        chan.users.splice(i, 1);
        break;
      }
    }
  }

  usersUI.update();
};

messages.pm = function(from, text)
{
  clientInfo.addLog(new Log('PM ' + from, text));
};

messages.nick = function(oldNick, newNick, channels)
{
  for (var i = 0; i < channels.length; ++i)
  {
    var chan = clientInfo.getChannel(channels[i]);
    var user = chan.getUser(oldNick);
    user.name = newNick;
  }

  var log = new Log('server', oldNick + ' is now known as ' + newNick);
  clientInfo.addLog(log);

  if (oldNick === clientInfo.nick)
    clientInfo.nick = newNick;

  usersUI.update();
};

messages.error = function(message)
{
  console.log('error: ' + JSON.stringify(message));
};

//
// Commands
//
var commands = {};
commands.connect = function(server, port)
{
  try
  {
    client = new irc.Client(server, clientInfo.nick);
  }
  catch (e)
  {
    clientInfo.addLog(new Log('Error', JSON.stringify(e)));
  }
  clientInfo.currentServer = server;
  setupListeners();
};
commands.server = commands.connect;

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
  client.send("NICK", nick);

  // We can change our nick with no confirmation in default channel
  if (clientInfo.currentChannel === defaultChannel)
  {
    clientInfo.nick = nick;
  }
};