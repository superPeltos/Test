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
?>

</div><!-- .site-content -->

<footer id="colophon" class="site-footer bg-blue" role="contentinfo">
    <div class="pre-footer position-relative py-5">
        <div class="position-absolute text-center bg-white rounded-circle container-logo d-flex justify-content-center align-items-center">
            <img class="w-100" src="<?php echo get_template_directory_uri() ?>/assets/img/logo.png" alt="">
        </div>
        <div class="container">
            <div class="row text-white">
                <div class="col-12 col-sm-2 offset-sm-1">
                  <?php
                  wp_nav_menu( array(
                    'theme_location' => 'footer-1',
                    'menu' => 'Footer 1',
                  ))
                  ?>
                </div>
                <div class="col-12 col-sm-2">
                  <?php
                  wp_nav_menu( array(
                    'theme_location' => 'footer-2',
                    'menu' => 'Footer 2',
                    'container_class' => 'color-white'
                  ))
                  ?>
                </div>
                <div class="col-6 col-sm-2 offset-sm-2">
                    <strong>Lorem</strong><br>
                    00 rue xxx<br>
                    67000 Strasbourg

                </div>
                <div class="col-6 col-sm-2">
                    <a class=" btn-rounded bg-unset px-4 py-2  color-white font-btn btn text-uppercase w-100 border border-white" href=""
                       title="">contact</a>
                </div>
            </div>
        </div>
    </div>
    <div class="footer py-4">
        <div class="container text-center color-white">
            <span class="float-left">Mentions légales</span>
            <span class="float-right">Tous droits réservés Lorem 2018.</span>
            <span class="">Conception</span>
        </div>
    </div>

</footer><!-- .site-footer -->
</div><!-- .site-inner -->
</div><!-- .site -->

<?php wp_footer(); ?>
</body>
</html>
