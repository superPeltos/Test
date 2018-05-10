(function ($) {
  var anim = require('./contrib/anime.js');
  var siteHeader = $('.site-header');

  var removeAnimElem = function () {
    anim.remove(siteHeader.find('img')[0]);
    anim.remove(siteHeader[0]);
  };
  var headerAnimeScroll = function (scroll) {
    var duration = 250;
    if (scroll > 20) {

      siteHeader.find('a').addClass('color-blue');
      siteHeader.find('a').removeClass('color-white');
      removeAnimElem();
      anim({
        targets: siteHeader.find('.site-header-main')[0],
        height: '60px',
        duration: duration,
        easing: 'easeInQuad',
      });
      anim({
        targets: siteHeader[0],
        backgroundColor: ["hsla(0, 0%, 100%,1)", "hsla(0, 0%, 100%,1)"],
        duration: duration,

      });
    } else {
      siteHeader.find('a').addClass('color-white');
      siteHeader.find('a').removeClass('color-blue');
      removeAnimElem();
      anim({
        targets: siteHeader.find('.site-header-main')[0],
        height: '80px',
        duration: duration,
        easing: 'easeInQuad'
      });
      anim({
        targets: siteHeader[0],
        backgroundColor: ["hsla(0, 0%, 100%,0)", "hsla(0, 0%, 100%,0)"],
        duration: duration,
        easing: 'easeInQuad'
      });
    }
  };

  function initHeaderScroll() {
    $(window).unbind("scroll.event");
    if ($(window).innerWidth() > 767) {
      siteHeader.css('background','unset');
      $(window).on('scroll.event', function (event) {
        console.log('launch');
        var scroll = $(window).scrollTop();
        headerAnimeScroll(scroll);
      })
    }else{
      siteHeader.css('background','white');
    }
  }

  initHeaderScroll();
  $(window).on('resize', function () {
    initHeaderScroll();
  })
})(jQuery);