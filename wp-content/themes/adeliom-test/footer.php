<?php
/**
 * The template for displaying the footer
 *
 * Contains the closing of the #content div and all content after
 *
 * @package WordPress
 * @subpackage Twenty_Sixteen
 * @since Twenty Sixteen 1.0
 */
$pageContact = get_page_by_path('contact');
$pageMention = get_page_by_path('mentions-legales');
$logoFooter =  get_field('logo_footer', 'option');
?>

</div><!-- .site-content -->


<footer id="colophon" class="site-footer bg-blue" role="contentinfo">
    <div class="pre-footer position-relative py-5">
        <div class="position-absolute text-center bg-white rounded-circle container-logo d-flex justify-content-center align-items-center">

            <img class="w-100 p-3" src="<?php echo $logoFooter['url'] ?>" alt="logoFooter">
        </div>
        <div class="container">
            <div class="row text-white">
                <div class="col-12 col-sm-2 offset-sm-1">
                  <?php
                  wp_nav_menu(array(
                    'theme_location' => 'footer-1',
                    'menu' => 'Footer 1',
                  ))
                  ?>
                </div>
                <div class="col-12 col-sm-2">
                  <?php
                  wp_nav_menu(array(
                    'theme_location' => 'footer-2',
                    'menu' => 'Footer 2',
                    'container_class' => 'color-white'
                  ))
                  ?>
                </div>
                <div class="col-6 col-sm-2 offset-sm-2">
                    <p><?php the_field('adresse', 'option'); ?></p>

                </div>
                <div class="col-6 col-sm-2">
                    <a class=" btn-rounded bg-unset px-4 py-2  color-white font-btn btn text-uppercase w-100 border border-white"
                       href="<?php echo get_the_permalink($pageContact->ID) ?>"
                       title="<?php echo get_the_title($pageContact->ID) ?>"><?php echo get_the_title($pageContact->ID) ?></a>
                </div>
            </div>
        </div>
    </div>
    <div class="footer py-4">
        <div class="container text-center color-white position-relative">
            <a href="<?php echo get_the_permalink($pageMention->ID) ?>"
               class="position-absolute t-0 position-relative-xs l-0 color-white hvr-to-top"><?php echo get_the_title($pageMention->ID) ?></a>
            <div class="text-center">
                <span class="">Conception</span>
                <img class="px-2" src="<?php echo get_template_directory_uri() ?>/assets/img/SignatureWeb_Adeliom.png"
                alt="logo Adeliom">
                <span>Agence digitale Adeliom</span>
            </div>
            <span class="position-absolute r-0 t-0 position-relative-xs">Tous droits réservés Lorem 2018.</span>
        </div>
    </div>

</footer><!-- .site-footer -->
</div><!-- .site-inner -->
</div><!-- .site -->

<?php wp_footer(); ?>
</body>
</html>
