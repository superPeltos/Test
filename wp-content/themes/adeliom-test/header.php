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

$logo =  get_field('logo', 'option');

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
            <div class="site-header-main container d-flex  justify-content-between align-items-center position-relative">
                <div class="site-branding mx-auto mx-md-0">

                  <?php if (is_front_page() && is_home()) : ?>
                      <h1 class="site-title"><a href="<?php echo esc_url(home_url('/')); ?>" rel="home" title="Accueil">
                              <img class="img-fluid"
                                   src="<?php echo $logo['url'] ?>"
                                   alt="logo"/>
                          </a></h1>
                  <?php else : ?>
                      <p class="site-title"><a href="<?php echo esc_url(home_url('/')); ?>" rel="home" title="Accueil">
                              <img class="img-fluid"
                                   src="<?php echo $logo['url']?>"
                                   alt="logo"/>
                          </a></p>
                  <?Php endif ?>
                </div><!-- .site-branding -->

              <?php if (has_nav_menu('primary')) : ?>
                  <!--<button id="menu-toggle" class="menu-toggle"><?php /*_e( 'Menu', $domain_text ); */ ?></button>-->
                  <a class="btn-menu d-block d-md-none position-absolute-xs color-blue-xs" href="#collapseMenuXs" role="button"
                     aria-expanded="false" aria-controls="collapseMenuXs">
                      <svg width="36" height="36" viewBox="0 0 36 36" version="1.1" xmlns="http://www.w3.org/2000/svg"
                           xmlns:xlink="http://www.w3.org/1999/xlink">
                          <g id="Canvas" fill="none">
                              <g id="menu">
                                  <g id="Group">
                                      <circle id="Ellipse" cx="18" cy="18" r="17.5" stroke="#3E444C"/>
                                      <path id="Vector"
                                            d="M 16.0714 0L 0.642857 0C 0.287357 0 0 0.288 0 0.642857C 0 0.997714 0.287357 1.28571 0.642857 1.28571L 16.0714 1.28571C 16.4269 1.28571 16.7143 0.997714 16.7143 0.642857C 16.7143 0.288 16.4269 0 16.0714 0Z"
                                            transform="translate(9.64307 12.0857)" fill="black"/>
                                      <path id="Vector_2"
                                            d="M 16.0714 0L 0.642857 0C 0.287357 0 0 0.288 0 0.642857C 0 0.997714 0.287357 1.28571 0.642857 1.28571L 16.0714 1.28571C 16.4269 1.28571 16.7143 0.997714 16.7143 0.642857C 16.7143 0.288 16.4269 0 16.0714 0Z"
                                            transform="translate(9.64307 17.3571)" fill="black"/>
                                      <path id="Vector_3"
                                            d="M 16.0714 0L 0.642857 0C 0.287357 0 0 0.288 0 0.642857C 0 0.997714 0.287357 1.28571 0.642857 1.28571L 16.0714 1.28571C 16.4269 1.28571 16.7143 0.997714 16.7143 0.642857C 16.7143 0.288 16.4269 0 16.0714 0Z"
                                            transform="translate(9.64307 22.6286)" fill="black"/>
                                  </g>
                              </g>
                          </g>
                      </svg>

                  </a>

                  <div id="site-header-menu" class="site-header-menu collapse mr-0 mr-md-4" id="collapseMenuXs">
                    <?php if (has_nav_menu('primary')) : ?>
                        <nav id="site-navigation" class="main-navigation d-flex  align-items-center " role="navigation"
                             aria-label="<?php esc_attr_e('Primary Menu', $domain_text); ?>">
                          <?php
                          wp_nav_menu(array(
                            'theme_location' => 'primary',
                            'menu_class' => 'primary-menu d-flex m-0 flex-column flex-sm-row text-uppercase p-0 font-weight-bold color-blue-xs',
                            'container_class' => 'd-inline-block menu-nav w-100',
                          ));

                          $pageContact = get_page_by_path('contact');

                          ?>
                        </nav><!-- .main-navigation -->
                    <?php endif; ?>

                  </div><!-- .site-header-menu -->
                  <div class="container-btn-close d-block d-md-none position-absolute-xs bg-blue text-center">
                      <a href="" class="btn-menu-close ">
                          <svg width="24" height="24" viewBox="0 0 24 24" version="1.1"
                               xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
                              <g id="Canvas" fill="none">
                                  <g id="Icon-Close">
                                      <g id="ic_close_black_24px">
                                          <path id="Vector"
                                                d="M 14 1.41L 12.59 0L 7 5.59L 1.41 0L 0 1.41L 5.59 7L 0 12.59L 1.41 14L 7 8.41L 12.59 14L 14 12.59L 8.41 7L 14 1.41Z"
                                                transform="translate(5 5)" fill="white"/>
                                      </g>
                                  </g>
                              </g>
                          </svg>

                      </a>
                  </div>
                  <a class="position-absolute color-blue-xs container-contact" href="<?php echo get_permalink($pageContact->ID) ?>" title="<?php echo get_the_title($pageContact->ID) ?>">
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
