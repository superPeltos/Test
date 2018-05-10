<?php
if (file_exists(get_template_directory() . '/config/global.php'))
  require_once 'config/global.php';
if (file_exists(get_template_directory() . '/config/content-type.php'))
  require_once 'config/content-type.php';
if (file_exists(get_template_directory() . '/config/taxonomy.php'))
  require_once 'config/taxonomy.php';
if (file_exists(get_template_directory() . '/config/page-options.php'))
  require_once 'config/page-options.php';

if (!function_exists('aw_setup')) :

  function aw_setup()
  {
    /*
     * Make theme available for translation.
     */
    load_theme_textdomain($domain_text);

    // Add default posts and comments RSS feed links to head.
    add_theme_support('automatic-feed-links');

    /*
     * Let WordPress manage the document title.
     */
    add_theme_support('title-tag');

    /*
     * Enable support for Post Thumbnails on posts and pages.
     */
    add_theme_support('post-thumbnails');
    set_post_thumbnail_size(1200, 9999);

    // This theme uses wp_nav_menu() in two locations.
    register_nav_menus(array(
      'primary' => __('Primary Menu', $domain_text),
    ));
  }
endif; // twentysixteen_setup
add_action('after_setup_theme', 'aw_setup');

if (!function_exists('aw_fonts_url')) :
  /**
   * Register Google fonts.
   * @return string Google fonts URL for the theme.
   */
  function aw_fonts_url()
  {
    $fonts_url = '';
    $fonts = array();
    $subsets = 'latin,latin-ext';

    /* translators: If there are characters in your language that are not supported by Merriweather, translate this to 'off'. Do not translate into your own language. */
    if ('off' !== _x('on', 'Open Sans font: on or off', 'aw')) {
      $fonts[] = 'Open Sans:300,300i,400,400i,600,600i,700,700i,800,800i';
    }

    if ($fonts) {
      $fonts_url = add_query_arg(array(
        'family' => urlencode(implode('|', $fonts)),
        'subset' => urlencode($subsets),
      ), 'https://fonts.googleapis.com/css');
    }

    return $fonts_url;
  }
endif;


function aw_scripts()
{
  // Add custom fonts, used in the main stylesheet.
  wp_enqueue_style('aw-fonts', aw_fonts_url(), array(), null);

  wp_deregister_script('jquery');
  wp_enqueue_script('jquery', get_template_directory_uri() . '/assets/js/contrib/jquery.js', array(), '3.2.1',true);
  wp_enqueue_script('bootstrap-collapse', get_template_directory_uri() . '/vendor/twbs/bootstrap/dist/js/bootstrap.js', array('jquery'), '',true);

  // Theme stylesheet.
  wp_enqueue_style('aw-style', get_template_directory_uri() . '/public/css/style.css');
  wp_enqueue_script('ad-script', get_template_directory_uri() . '/public/js/index.js', array('jquery'), '20161109', true);

}

add_action('wp_enqueue_scripts', 'aw_scripts');

/**
 * Custom template tags for this theme.
 */
require get_template_directory() . '/inc/template-tags.php';
require get_template_directory() . '/inc/custom-post.php';

function register_mp_menus()
{
  register_nav_menus(
    array('footer-1' => __('Footer 1'), 'footer-2' => __('Footer 2')));
}

add_action('init', 'register_mp_menus');

if( function_exists('acf_add_options_page') ) {

  acf_add_options_page();

}