var template = 
[
  '<div class="log-window">',
  '  {{#user.currentChannel.logs}}',
  '    <div class="log-item-wrapper" on-mousedown="activate">',
  '      <div class="log-item" data-from="{{from}}">',
  '        <span class="log-item-from">{{sender}}</span>',
  '        <span class="log-item-message">{{message}}</span>',
  '        <a target="_blank" class="log-item-link" href="{{linkHref}}" style="display: {{linkDisplay}};">{{linkHref}}</a>',
  '        <a target="_blank" href="{{imgSrc}}" style="display: {{imgDisplay}};"><img class="log-item-image" src="{{imgSrc}}" /></a>',
  '        <span class="log-item-time">{{prettyTime}}</span>',
  '      </div>',
  '    </div>',
  '  {{/user.currentChannel.logs}}',
  '</div>'
].join('\n');

module.exports = function(Ractive)
{
  return Ractive.extend(
  {
    template: template,
    magic: true,
    init: function()
    {
      this.on('activate', function(e)
      {
        e.context.activate();
      });
    }
  });
};