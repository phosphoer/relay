var _ = require('underscore');
var fs = require('fs');
var GithubAPI = require('github');
var imgur = require('imgur');
var irc = require('irc');
var levenshtein = require('fast-levenshtein');
var Channel = require('./channel');
var Log = require('./log');
var packageJSON = require('./package.json');

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
  this.lastPMFrom = null;
  this.Ractive = Ractive;
};

App.prototype.initialize = function()
{
  imgur.setKey('8fe3c8f3a95d595');

  var that = this;

  // Build channels window
  var ChannelTemplate = require('./channel-template.js')(this.Ractive);
  this.channelsUI = new ChannelTemplate(
  {
    el: 'channelContainer',
    data:
    {
      user: this
    }
  });

  // Build user window
  var UsersTemplate = require('./users-template.js')(this.Ractive);
  this.usersUI = new UsersTemplate(
  {
    el: 'usersContainer',
    data:
    {
      user: this
    }
  });

  // Build log window
  var LogsTemplate = require('./logs-template.js')(this.Ractive);
  this.logUI = new LogsTemplate(
  {
    el: 'logContainer',
    data:
    {
      user: this
    }
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

  // Focus input on any key press
  var input = window.document.querySelector('.user-input');
  window.addEventListener('keydown', function(e)
  {
    input.focus();
  });

  // Handle enter press on input
  input.addEventListener('keydown', function(e)
  {
    // Hit enter on the keyboard
    if (e.keyCode === 13 && input.value)
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
    // On other key presses let's check the buffer contents
    // and do any necessary auto completes
    // Hard coded for now to look for /r
    else
    {
      if (input.value === '/r' && e.keyCode === 32 && that.lastPMFrom)
      {
        input.value = '/message ' + that.lastPMFrom + ' ';
      }
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

  this.checkForUpdate();
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
    this.possible = _.keys(this.commands);
    var closest = _.min(_.keys(this.commands), function(candidate)
    {
       return levenshtein.get(command, candidate);
    });

    if (levenshtein.get(command, closest) <= 2)
    {
      this.addLog('>', message);
      this.commands[closest].apply(this.commands, args);
    }
    else
    {
      this.addLog('x', message);
    }
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

App.prototype.checkForUpdate = function()
{
  var that = this;

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
        if ((gitHubVersion[0] > packageVersion[0] || gitHubVersion[1] > packageVersion[1] || gitHubVersion[2] > packageVersion[2])
            && gitHubVersion.length > 2)
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
};

module.exports = App;
