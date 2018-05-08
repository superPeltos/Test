<?php
/**
 * Created by PhpStorm.
 * User: tibop
 * Date: 02/05/2018
 * Time: 00:27
 */

// Register Custom Post Type
function reference_post_type() {

  $labels = array(
    'name'                  => _x( 'References', 'Post Type General Name', 'ad' ),
    'singular_name'         => _x( 'Reference', 'Post Type Singular Name', 'ad' ),
    'menu_name'             => __( 'Reference', 'ad' ),
    'name_admin_bar'        => __( 'Reference', 'ad' ),
    'archives'              => __( 'Item Archives', 'ad' ),
    'attributes'            => __( 'Item Attributes', 'ad' ),
    'parent_item_colon'     => __( 'Parent Item:', 'ad' ),
    'all_items'             => __( 'All Items', 'ad' ),
    'add_new_item'          => __( 'Add New Item', 'ad' ),
    'add_new'               => __( 'Add New', 'ad' ),
    'new_item'              => __( 'New Item', 'ad' ),
    'edit_item'             => __( 'Edit Item', 'ad' ),
    'update_item'           => __( 'Update Item', 'ad' ),
    'view_item'             => __( 'View Item', 'ad' ),
    'view_items'            => __( 'View Items', 'ad' ),
    'search_items'          => __( 'Search Item', 'ad' ),
    'not_found'             => __( 'Not found', 'ad' ),
    'not_found_in_trash'    => __( 'Not found in Trash', 'ad' ),
    'featured_image'        => __( 'Featured Image', 'ad' ),
    'set_featured_image'    => __( 'Set featured image', 'ad' ),
    'remove_featured_image' => __( 'Remove featured image', 'ad' ),
    'use_featured_image'    => __( 'Use as featured image', 'ad' ),
    'insert_into_item'      => __( 'Insert into item', 'ad' ),
    'uploaded_to_this_item' => __( 'Uploaded to this item', 'ad' ),
    'items_list'            => __( 'Items list', 'ad' ),
    'items_list_navigation' => __( 'Items list navigation', 'ad' ),
    'filter_items_list'     => __( 'Filter items list', 'ad' ),
  );
  $rewrite = array(
    'slug'                  => 'reference',
    'with_front'            => true,
    'pages'                 => true,
    'feeds'                 => true,
  );
  $args = array(
    'label'                 => __( 'Reference', 'ad' ),
    'description'           => __( 'Reference Type Description', 'ad' ),
    'labels'                => $labels,
    'supports'              => array( 'title', 'editor', 'thumbnail' ),
    'taxonomies'            => array( 'reference' ),
    'hierarchical'          => false,
    'public'                => true,
    'show_ui'               => true,
    'show_in_menu'          => true,
    'menu_position'         => 5,
    'show_in_admin_bar'     => true,
    'show_in_nav_menus'     => true,
    'can_export'            => true,
    'has_archive'           => true,
    'exclude_from_search'   => false,
    'publicly_queryable'    => true,
    'rewrite'               => $rewrite,
    'capability_type'       => 'page',
  );
  register_post_type( 'reference', $args );

}
add_action( 'init', 'reference_post_type', 0 );