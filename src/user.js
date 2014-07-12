module.exports = function(appModel, name)
{
  this.name = name;

  this.activate = function(e)
  {
    console.log('test');
    var input = window.document.querySelector('.user-input');
    input.value = '/message ' + name;
  };
};