<?php
/**
 * The main template file
 *
 * This is the most generic template file in a WordPress theme
 * and one of the two required files for a theme (the other being style.css).
 * It is used to display a page when nothing more specific matches a query.
 * E.g., it puts together the home page when no home.php file exists.
 *
 * @link http://codex.wordpress.org/Template_Hierarchy
 *
 * @package WordPress
 * @subpackage Twenty_Sixteen
 * @since Twenty Sixteen 1.0
 */

get_header(); ?>


<?php
/*
 *  Get Who are we
 */
$wawPage = get_page_by_path('qui-somme-nous');
$wawId = $wawPage->ID;
$wawCustomTitle = get_field('custom_title', $wawId);
$wawCustomContent = $wawPage->post_content;
$wawPicto = get_field('picto', $wawId);
$wawThumbnsUrl = get_the_post_thumbnail_url($wawId);
$wawTitle = get_the_title($wawId);

/*
 *  Get CPE
 */
$cpePage = get_page_by_path('le_cpe');
$cpeId = $cpePage->ID;
$cpeCustomTitle = get_field('custom_title', $cpeId, false);
$cpeCustomContent = $cpePage->post_content;
$cpePicto = get_field('picto', $cpeId);
$cpeTitle = get_the_title($cpeId);
?>

<div id="primary" class="content-area">
    <main id="main" class="site-main bg-grey" role="main">
        <div class="container-fluid">
            <div class="row waw-block position-relative" style="background-image: url(<?php print $wawThumbnsUrl ?>);">
                <!-- <div class="position-absolute wawTriangle"></div>-->

                <img class="position-absolute wawTriangle"
                     src="<?php echo get_template_directory_uri() ?>/assets/img/triangle.png" alt="">
                <div class="position-absolute wawSmallTriangle"></div>

                <div class="container">
                    <div class="col-12 col-lg-6 col-md-10">
                        <div class="d-flex align-items-center">
                            <div class="d-md-block d-none container-ic">
                              <?php echo $wawPicto; ?>
                            </div>
                            <div class="ml-2">
                                <h2 class="font-h1 m-0 pb-4"><?php print $wawCustomTitle; ?></h2>
                            </div>
                        </div>
                        <div class="col-10 p-0 mb-4">
                            <span class="separator separator-h bg-red d-inline-block mb-4"></span>
                            <div class="font-basic"><?php echo $wawCustomContent; ?></div>
                        </div>
                        <div class="mb-5">
                            <a class="text-uppercase btn font-btn bg-red color-white px-4 py-2 btn-rounded" href=""
                               title="">
                              <?php echo $wawTitle ?>
                            </a>
                        </div>

                    </div>
                </div>
            </div>
        </div>
        <div class="position-relative home-second-part">
            <div class="container">
                <div class="cpe-block bg-white position-relative">
                    <img src="<?php echo get_template_directory_uri() ?>/assets/img/cpe-dtriangle.svg" alt=""
                         class="position-absolute">
                    <div class="row py-6 px-7">
                        <div class="col-12 col-md-6">
                            <div class="d-flex">
                              <div class="d-none d-md-block container-ic"><?php echo $cpePicto; ?></div>
                                <h2 class="ml-0 ml-md-5 font-h2 color-red"><?php echo $cpeCustomTitle; ?></h2>
                            </div>
                        </div>
                        <div class="col-12 col-md-6 position-relative ">
                            <span class="separator separator-v position-absolute bg-red "></span>
                          <div class="font-basic"><?php echo $cpeCustomContent; ?></div>
                        </div>
                    </div>
                    <div class="position-absolute  btn-cpe text-uppercase">
                        <a class=" btn-rounded bg-red px-4 py-2  color-white font-btn btn" href=""
                           title=""><?php echo $cpeTitle ?></a>
                    </div>
                </div>
            </div>
            <div class="container-fluid p-0 m-0 position-relative block-reference pb-10">
                <div class="container position-relative">
                    <div class="reference-header pb-4">
                        <h2 class="font-h2">Références</h2>
                    </div>
                    <div class="row container-reference ">

                      <?php // The Query
                      $args = array('post_type' => 'reference', 'posts_per_page' => 10);
                      $loop = new WP_Query($args);
                      while ($loop->have_posts()) : $loop->the_post();
                        get_template_part('template-parts/loop_reference', get_post_format());
                      endwhile; ?>
                    </div>
                    <div class="position-absolute position-relative-xs btn-reference text-uppercase">
                        <a class=" btn-rounded bg-blue px-4 py-2  color-white font-btn btn" href=""
                           title="">Voir tout nos projet</a>
                    </div>
                </div>

            </div>
        </div>
    </main><!-- .site-main -->
</div><!-- .content-area -->


<?php get_footer(); ?>
