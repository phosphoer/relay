var Channel = require('./channel');
var Log = require('./log');
var packageJSON = require('./package.json');
var irc = require('irc');
var imgur = require('imgur');
var GithubAPI = require('github');
var fs = require('fs');

var App = function(Ractive)
{
  this.nick = this.getSave().nick || 'relay_user';
  this.channels = [new Channel('default', this)];
  this.defaultChannel = this.channels[0];
  this.currentChannel = this.defaultChannel;
  this.client = new irc.Client('', 'unnamed-user');
  this.github = new GithubAPI({version: "3.0.0"});
  this.connected = false;
  this.channelsUI = null;
  this.usersUI = null;
  this.logUI = null;
  this.commands = require('./commands')(this);
  this.events = require('./events')(this);
  this.commandHistory = [];
  this.currentHistoryIndex = 0;
  this.Ractive = Ractive;
};

App.prototype.initialize = function()
{
  imgur.setKey('8fe3c8f3a95d595');

  var that = this;
  // Build channels window
  this.channelsUI = new this.Ractive(
  {
    el: 'channelContainer',
    template: '#channelsTemplate',
    data:
    {
      user: this
    }
  });
  this.channelsUI.on('activate', function(e)
  {
    e.context.activate();
  });

  // Build user window
  this.usersUI = new this.Ractive(
  {
    el: 'usersContainer',
    template: '#usersTemplate',
    data:
    {
      user: this
    }
  });
  this.usersUI.on('activate', function(e)
  {
    e.context.activate();
  });

  // Build log window
  this.logUI = new this.Ractive(
  {
    el: 'logContainer',
    template: '#logTemplate',
    data:
    {
      user: this
    }
  });
  this.logUI.on('activate', function(e)
  {
    e.context.activate(e);
  });

  // Default message
  this.addLog('app', 'Welcome to Relay!');

  // Show recent servers
  var save = this.getSave();
  if (save.servers)
  {
    this.addLog('app', 'Recent servers...');
    for (var i in save.servers)
    {
      this.addLog('app', i + ':' + save.servers[i]);

      // Force log to be an IRC link
      this.channels[0].logs[this.channels[0].logs.length - 1].isIrcLink = true;
      this.channels[0].logs[this.channels[0].logs.length - 1].ircLink = i;
    }
  }

  // Get app directory
  var path = require('path');
  var appPath = path.dirname(process.execPath);
  if (appPath.indexOf('Frameworks/node-webkit Helper.app/Contents/MacOS') > 0)
  {
    appPath = path.resolve(appPath, '..', '..', '..', '..', '..', '..');
  }

  var downloadUpdate = function(url, callback)
  {
    var http = require('https');
    var file = fs.createWriteStream(appPath + '/package_new.nw');
    var request = http.get(url, function(response)
    {
      if (response.statusCode === 302)
      {
        console.log('download redirecting');
        downloadUpdate(response.headers.location, callback);
        return;
      }

      response.on('data', function(data)
      {
        file.write(data);
      });
      response.on('end', function()
      {
        file.end();
        callback();
      });
    });
  };

  // Check for updates
  if (fs.existsSync(appPath + '/package.nw'))
  {
    var repo = this.github.releases.listReleases({owner: 'phosphoer', repo: 'relay'}, function(error, releases)
    {
      console.log('checking for updates');
      for (var i = 0; i < releases.length; ++i)
      {
        // Find a release with a higher version number
        var tagName = releases[i].tag_name;
        tagName = tagName.replace('v', '');
        var gitHubVersion = tagName.split('.');
        var packageVersion = packageJSON.version.split('.');
        if (gitHubVersion[0] > packageVersion[0] || gitHubVersion[1] > packageVersion[1] || gitHubVersion[2] > packageVersion[2])
        {
          console.log('found newer release');
          // Find the package asset
          for (var j = 0; j < releases[i].assets.length; ++j)
          {
            var asset = releases[i].assets[j];
            if (asset.name === 'package.nw')
            {
              downloadUpdate(asset.browser_download_url, function()
              {
                console.log('download complete');
                if (fs.existsSync(appPath + '/package.nw'))
                  fs.unlinkSync(appPath + '/package.nw');
                fs.renameSync(appPath + '/package_new.nw', appPath + '/package.nw');
                that.addLog('app', 'update downloaded, restart to apply');
              });
              break;
            }
          }
        }
      }
    });
  }

  // Handle enter press on input
  var input = window.document.querySelector('.user-input');
  input.addEventListener('keydown', function(e)
  {
    // Hit enter on the keyboard
    if (e.keyCode === 13)
    {
      var command = input.value;
      input.value = '';

      // Try parsing input as a command, otherwise send it as a
      // message
      if (!that.parseCommand(command))
        that.sendMessage(command);

      that.commandHistory.push(command);
      that.currentHistoryIndex = 0;
    }
  });

  // Handle up arrow press
  window.addEventListener('keydown', function(e)
  {
    if (e.keyCode === 38)
    {
      var cmd = that.commandHistory[that.commandHistory.length - that.currentHistoryIndex - 1];
      if (cmd)
        input.value = cmd;
      
      that.currentHistoryIndex = Math.min(that.currentHistoryIndex + 1, that.commandHistory.length - 1);
    }
    if (e.keyCode === 40)
    {
      that.currentHistoryIndex = Math.max(that.currentHistoryIndex - 1, 0);
      var cmd = that.commandHistory[that.commandHistory.length - that.currentHistoryIndex - 1];
      if (cmd)
        input.value = cmd;
    }
  });

  // Handle file drop
  window.ondragover = function(e) { e.preventDefault(); return false };
  window.ondrop = function(e)
  {
    e.preventDefault();

    // for (var i = 0; i < e.dataTransfer.files.length; ++i)
    // {
    //   var path = e.dataTransfer.files[i].path;
    //   if (path.match(/(.png|.gif|.jpg|.jpeg)$/))
    //   {
    //     imgur.upload(path, function(response)
    //     {
    //       console.log(response);
    //     });
    //   }
    // }

    return false;
  };
};

App.prototype.sendMessage = function(message)
{
  this.addLog(this.nick, message);
  this.commands.message(this.currentChannel.name, message);
};

App.prototype.parseCommand = function(message)
{
  if (message[0] !== '/' && message[0] !== '\\')
    return false;

  var parts = message.split(' ');
  var command = parts[0].slice(1);
  var args = parts.slice(1);

  if (command in this.commands)
  {
    this.addLog('>', message);
    this.commands[command].apply(this.commands, args);
  }
  else
  {
    this.addLog('x', message);
  }

  return true;
};

App.prototype.setupListeners = function()
{
  for (var i in this.events)
    this.client.addListener(i, this.events[i]);
};

App.prototype.resetChannels = function()
{
  this.channels = [this.defaultChannel];
  this.currentChannel = this.channels[0];
  this.channelsUI.update();
  this.logUI.update();
  this.usersUI.update();
};

App.prototype.getChannel = function(name)
{
  for (var i = 0; i < this.channels.length; ++i)
    if (this.channels[i].name === name)
      return this.channels[i];
};

App.prototype.addLog = function(sender, message)
{
  this.currentChannel.addLog(sender, message);
  var logWin = window.document.querySelector('.log-window');
  logWin.scrollTop = logWin.scrollHeight;    
};

App.prototype.getSave = function()
{
  if (!window.localStorage['relay-save'])
    window.localStorage['relay-save'] = JSON.stringify({});
  return JSON.parse(window.localStorage['relay-save']);
};

App.prototype.setSave = function(save)
{
  window.localStorage['relay-save'] = JSON.stringify(save);
};

module.exports = App;
