<?php
/**
 * The template for displaying the header
 *
 * Displays all of the head element and everything up until the "site-content" div.
 *
 * @package WordPress
 * @subpackage Twenty_Sixteen
 * @since Twenty Sixteen 1.0
 */

?><!DOCTYPE html>
<html <?php language_attributes(); ?> class="no-js">
<head>
    <meta charset="<?php bloginfo('charset'); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="profile" href="http://gmpg.org/xfn/11">
  <?php if (is_singular() && pings_open(get_queried_object())) : ?>
      <link rel="pingback" href="<?php bloginfo('pingback_url'); ?>">
  <?php endif; ?>
  <?php wp_head(); ?>
</head>

<body <?php body_class(); ?>>
<div id="page" class="site">
    <div class="site-inner">
        <header id="masthead" class="site-header position-fixed w-100" role="banner">
            <div class="site-header-main container d-flex justify-content-between align-items-center">
                <div class="site-branding">

                  <?php if (is_front_page() && is_home()) : ?>
                      <h1 class="site-title"><a href="<?php echo esc_url(home_url('/')); ?>" rel="home">
                              <img class="img-fluid"
                                   src="<?php echo get_template_directory_uri(); ?>/assets/img/logo.png"
                                   alt="?"/>
                          </a></h1>
                  <?php else : ?>
                      <p class="site-title"><a href="<?php echo esc_url(home_url('/')); ?>" rel="home">
                              <img class="img-fluid"
                                   src="<?php echo get_template_directory_uri(); ?>/assets/img/logo.png"
                                   alt="?"/>
                          </a></p>
                  <?Php endif ?>
                </div><!-- .site-branding -->

              <?php if (has_nav_menu('primary')) : ?>
                  <!--<button id="menu-toggle" class="menu-toggle"><?php /*_e( 'Menu', $domain_text ); */ ?></button>-->

                  <div id="site-header-menu" class="site-header-menu">
                    <?php if (has_nav_menu('primary')) : ?>
                        <nav id="site-navigation" class="main-navigation d-flex align-items-center" role="navigation"
                             aria-label="<?php esc_attr_e('Primary Menu', $domain_text); ?>">
                          <?php
                          wp_nav_menu(array(
                            'theme_location' => 'primary',
                            'menu_class' => 'primary-menu d-flex m-0',
                            'container_class' => 'd-inline-block',
                          ));

                          $pageContact = get_page_by_path('contact');

                          ?>

                            <a href="<?php echo get_permalink($pageContact->ID) ?>">
                                <svg width="40" height="40" viewBox="0 0 40 40" version="1.1"
                                     xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
                                    <g id="Canvas" fill="none">
                                        <g id="Group 5">
                                            <circle id="Ellipse" cx="20" cy="20" r="19.5" stroke="white"/>
                                            <g id="ic_mail_outline_white_24px (1)">
                                                <path id="Vector"
                                                      d="M 14.7542 0L 1.63936 0C 0.737711 0 0.00819678 0.75 0.00819678 1.66667L 0 11.6667C 0 12.5833 0.737711 13.3333 1.63936 13.3333L 14.7542 13.3333C 15.6559 13.3333 16.3936 12.5833 16.3936 11.6667L 16.3936 1.66667C 16.3936 0.75 15.6559 0 14.7542 0ZM 14.7542 11.6667L 1.63936 11.6667L 1.63936 3.33333L 8.19679 7.5L 14.7542 3.33333L 14.7542 11.6667ZM 8.19679 5.83333L 1.63936 1.66667L 14.7542 1.66667L 8.19679 5.83333Z"
                                                      transform="translate(12.2222 13.3333)" fill="white"/>
                                            </g>
                                        </g>
                                    </g>
                                </svg>
                            </a>

                        </nav><!-- .main-navigation -->
                    <?php endif; ?>

                  </div><!-- .site-header-menu -->
              <?php endif; ?>
            </div><!-- .site-header-main -->

          <?php if (get_header_image()) : ?>
            <?php
            /**
             * Filter the default twentysixteen custom header sizes attribute.
             *
             * @since Twenty Sixteen 1.0
             *
             * @param string $custom_header_sizes sizes attribute
             * for Custom Header. Default '(max-width: 709px) 85vw,
             * (max-width: 909px) 81vw, (max-width: 1362px) 88vw, 1200px'.
             */
            $custom_header_sizes = apply_filters('twentysixteen_custom_header_sizes', '(max-width: 709px) 85vw, (max-width: 909px) 81vw, (max-width: 1362px) 88vw, 1200px');
            ?>
              <div class="header-image">
                  <a href="<?php echo esc_url(home_url('/')); ?>" rel="home">
                      <img src="<?php header_image(); ?>"
                           srcset="<?php echo esc_attr(wp_get_attachment_image_srcset(get_custom_header()->attachment_id)); ?>"
                           sizes="<?php echo esc_attr($custom_header_sizes); ?>"
                           width="<?php echo esc_attr(get_custom_header()->width); ?>"
                           height="<?php echo esc_attr(get_custom_header()->height); ?>"
                           alt="<?php echo esc_attr(get_bloginfo('name', 'display')); ?>">
                  </a>
              </div><!-- .header-image -->
          <?php endif; // End header image check. ?>
        </header><!-- .site-header -->

        <div id="content" class="site-content ">
