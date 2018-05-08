(function ($) {
  var anim = require('./contrib/anime.js');
  var siteHeader = $('.site-header');

  var removeAnimElem = function () {
    anim.remove(siteHeader.find('img')[0]);
    anim.remove(siteHeader[0]);
  };
  var headerAnimeScroll = function (scroll) {
    if (scroll > 20) {
      var duration = 150;
      siteHeader.find('a').addClass('color-blue');
      siteHeader.find('a').removeClass('color-white');
      removeAnimElem();
      anim({
        targets: siteHeader.find('img')[0],
        width: '50px',
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
        targets: siteHeader.find('img')[0],
        width: '100px',
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
    if ($(window).innerWidth() > 640) {
      $(window).on('scroll.event', function (event) {
        console.log('launch');
        var scroll = $(window).scrollTop();
        headerAnimeScroll(scroll);
      })
    }
  }

  initHeaderScroll();
  $(window).on('resize', function () {
    initHeaderScroll();
  })
})(jQuery);