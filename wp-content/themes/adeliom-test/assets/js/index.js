(function($) {
  var anim = require('./contrib/anime.js');
  var referenceImg = $('.referenceImage')[0];
  require('./headerScroll.js');


  function animateDash(elem,scale, duration, elasticity) {
    anim.remove($(elem).find('.dash')[0]);
    anim({
      targets: $(elem).find('.dash')[0] ,
      width: scale,
      duration: duration,
      delay: 200,
      easing: 'easeInQuad'
    });
  }
  function animateWording(elem,scale, duration, elasticity) {
    anim.remove($(elem).find('.wording')[0]);
    anim({
      targets: $(elem).find('.wording')[0] ,
      opacity: scale,
      duration: duration,
      delay: 280,
      easing: 'easeInQuad'
    });
  }

  function enterButton() {
    animateDash(this,'36px', 80, 400);
    animateWording(this,'1', 200, 400);
  }
  function leaveButton() {
    animateDash(this,'0px', 0, 300);
    animateWording(this,'0', 0, 400);
  }

  $('.reference').hover(enterButton, leaveButton);
})( jQuery );