<?php
/**
 * The template part for displaying content
 *
 * @package WordPress
 * @subpackage Twenty_Sixteen
 * @since Twenty Sixteen 1.0
 */
?>

<article class="col-12 col-sm-4 reference mb-5 mb-sm-0" id="post-<?php the_ID(); ?>">
    <a href="">
        <div class="bg-white">

            <header class="entry-header position-relative">
                <div class="reference-overlay position-absolute w-100 h-100 d-flex align-items-center p-5">
                    <div>
                        <span class="dash d-inline-block bg-white vertical-align mr-2"></span>
                        <span class="wording color-white vertical-align text-uppercase"> Découvrir plus</span>
                    </div>
                </div>
                <img src="<?php echo get_the_post_thumbnail_url(); ?>" alt="" class="img-fluid w-100 referenceImage">
            </header><!-- .entry-header -->


            <div class="entry-content pt-4 pb-5 px-4">
              <?php the_title(sprintf('<h3 class="entry-title font-h3 color-black font-weight-bold mt-3 mb-4 ">', esc_url(get_permalink())), '</h2>'); ?>

                <span class="mr-4">
                  <img class="mr-1" src="<?php echo  get_template_directory_uri() . '/assets/img/ic-calendar.svg' ?>" alt="icone-calendar">
                  <?php
                  echo get_field('date');
                  ?>
                  </span>
                <span>
                    <img class="mr-1" src="<?php echo  get_template_directory_uri() . '/assets/img/ic-euro.svg' ?>" alt="icone-euro">
                  <?php
                  echo get_field('price');
                  ?>
                    <span>M</span>
                </span>

            </div><!-- .entry-content -->

        </div>
    </a>
</article><!-- #post-## -->
