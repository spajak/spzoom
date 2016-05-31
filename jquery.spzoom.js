/*!
 * Simple jQuery image zoomer plugin
 *
 * Author: Sebatian Pająk <spconv@gmail.com>
 * Version: 0.2.0 (26/04/2016)
 * Licensed under the MIT license
 */

;(function($, undefined) {
    'use strict';

    $.fn.spzoom = function(options) {
        return this.each(function() {
            if (this.tagName.toLowerCase() == 'a' && this.getAttribute("href")) {
                if (!$.data(this, 'plugin_spzoom')) {
                    $.data(this, 'plugin_spzoom', new Spzoom($(this), options));
                }
            }
        });
    };


    $.fn.spzoom.defaults = {
        width: 250,             // Zoom window width in pixels
        height: 250,            // Zoom window height in pixels
        position: 'right',      // top, right, bottom, left
        margin: 20,             // Zoom window margin (space)
        showTitle: true,        // Whether to display image title
        titlePosition: 'bottom' // top, bottom
    };


    /**
     * Zoom plugin constructor
     */
    function Spzoom($element, options)
    {
        var defaultOptions = $.fn.spzoom.defaults;

        for (var optionName in defaultOptions) {
            var dataName = 'spzoom' + optionName.charAt(0).toUpperCase() + optionName.slice(1);
            if ($element.data(dataName) !== undefined) {
                defaultOptions[optionName] = $element.data(dataName);
            }
        }

        // Merged options
        this.options = $.extend(defaultOptions, options || {});

        // Big image loading states
        this.PENDING  = 0;
        this.LOADING  = 1;
        this.LOADED   = 2;
        this.DISABLED = 3;

        // Current loading state
        this.state = this.PENDING;

        // Cursor offset
        this.x = 0;
        this.y = 0;

        // This flag is true zoom should not be displayed
        this.hidden = false;

        // jQuery DOM elements & events
        // -----------------------------------------
        this.$element = $element.css({
            'position': 'relative',
            'text-decoration': 'none',
            'outline-style': 'none'
        });

        this.$element
            .mouseover($.proxy(this.onEnter, this))
            .mouseout($.proxy(this.onOut, this))
            .mousemove($.proxy(this.onMove, this));

        this.$thumbImage = $("img", this.$element).first();

        this.$image = $('<img class="spzoom-image"/>').css({
            'display': 'block',
            'border': '0 none',
            'position': 'relative',
            'left': 0,
            'top': 0
        });

        this.$imageWrapper = $('<div class="spzoom-image-wrapper"/>').css({
            'position': 'relative',
            'left': 0,
            'top': 0,
            'overflow': 'hidden'
        });

        this.$zoom = $('<div class="spzoom-zoom"/>').css({
            'box-sizing': 'border-box',
            'position': 'absolute',
            'top': 0,
            'left': 0,
            'overflow': 'hidden',
            'visibility': 'hidden',
            'display': 'block',
            'width': 0,
            'height': 0
        });

        this.$tracker = $('<div class="spzoom-tracker"/>').css({
            'box-sizing': 'border-box',
            'position': 'absolute',
            'cursor': 'crosshair',
            'top': 0,
            'left': 0,
            'width': 0,
            'height': 0,
            'opacity': 0.5,
            'visibility': 'hidden'
        });

        this.$title = $('<div class="spzoom-title"/>').css({
            'position': 'absolute',
            'z-index': '100',
            'left': 0,
            'right': 0,
            'opacity': 0.75
        });

        this.$loader = $('<div class="spzoom-loader"/>').css({
            'display': 'none',
            'position': 'absolute',
            'left': 0,
            'top': 0,
            'visibility': 'hidden',
            'opacity': 0.6
        });
    };


    Spzoom.prototype.init = function() {
        // Ensure we need initialization at all
        if (this.state !== this.PENDING) {
            return;
        }

        // Ensure thumb image is completely loaded
        if (!this.$thumbImage.prop('complete') ||
            this.$thumbImage.prop('naturalWidth') === undefined
        ) {
            return;
        }

        this.state = this.LOADING;

        this.$imageWrapper.append(this.$image);
        this.$zoom.append(this.$imageWrapper);

        // Build image title
        if (this.options.showTitle) {
            var title = this.$element.attr('title');
            if (title) {
                this.$title
                    .text(title)
                    .css((this.options.titlePosition == 'top' ? {'top': 0} : {'bottom': 0}));

                this.$zoom.append(this.$title);
            }
        }

        this.$element.append(this.$tracker);
        this.$element.append(this.$zoom);


        this.$element.click($.proxy(this.onClick, this));

        this.$element.append(this.$loader);

        var x = this.$thumbImage.offset().left + (this.$thumbImage.width() - this.$loader.outerWidth())/2;
        var y = this.$thumbImage.offset().top + (this.$thumbImage.height() - this.$loader.outerHeight())/2;

        this.$loader.show()
            .offset({'left': x, 'top': y})
            .css('visibility', 'visible');

        this.loadImage().then(
            $.proxy(this.onLoad, this),
            $.proxy(this.onLoadError, this)
        );
    };

    Spzoom.prototype.loadImage = function() {
        var deferred = $.Deferred();
        var $img = this.$image;

        $img.on({
            load: deferred.resolve,
            error: deferred.reject
        });

        $img.attr('src', this.$element.attr('href'));

        // Load event may not fire if the image goes from browser cache
        if ($img.prop('complete') && $img.prop('naturalWidth') !== undefined) {
            setTimeout(deferred.resolve);
        }

        return deferred.promise();
    };


    Spzoom.prototype.render = function() {
        if (this.state !== this.LOADED) {
            // Not initialized yet??
            this.init();
            return;
        }

        if (true === this.hidden) {
            return;
        }

        // Convienient shortcuts
        var thumb_w = this.$thumbImage.width();
        var thumb_h = this.$thumbImage.height();
        var thumb_x = this.$thumbImage.offset().left;
        var thumb_y = this.$thumbImage.offset().top;
        var image_w = this.$image.width();
        var image_h = this.$image.height();

        // If image is not bigger than thumb - don't render
        if (thumb_w >= image_w || thumb_h >= image_h) {
            return;
        }

        // If cursor is not over the thumb - don't render
        if (this.x < thumb_x || this.x > thumb_x + thumb_w ||
            this.y < thumb_y || this.y > thumb_y + thumb_h
        ) {
            return;
        }

        // Calculate the scale
        var scale_x = thumb_w/image_w;
        var scale_y = thumb_h/image_h;

        // Calculate tracker size
        var tracker_w = Math.min(this.options.width * scale_x, thumb_w);
        var tracker_h = Math.min(this.options.height * scale_y, thumb_h);

        // Calculate tracker offset. Make sure tracker is inside $thumbImage rectangle
        var tracker_x = Math.min(Math.max(this.x - tracker_w/2, thumb_x), thumb_x + thumb_w - tracker_w);
        var tracker_y = Math.min(Math.max(this.y - tracker_h/2, thumb_y), thumb_y + thumb_h - tracker_h);

        // Scale coordinates for big image
        var image_x = ((tracker_x - thumb_x)/scale_x) * (-1);
        var image_y = ((tracker_y - thumb_y)/scale_y) * (-1);

        // Calculate zoom offset
        var zoom_x, zoom_y;

        switch (this.options.position) {
            case 'top':
                zoom_x = thumb_x;
                zoom_y = thumb_y - this.options.height - this.options.margin;
                break;
            case 'bottom':
                zoom_x = thumb_x;
                zoom_y = thumb_y + thumb_h + this.options.margin;
                break;
            case 'left':
                zoom_x = thumb_x - this.options.width - this.options.margin;
                zoom_y = thumb_y;
                break;
            default: // default is right
                zoom_x = thumb_x + thumb_w + this.options.margin;
                zoom_y = thumb_y;
                if ($(document).width() < zoom_x + this.options.width) {
                    zoom_x = thumb_x - (this.options.width - thumb_w);
                    zoom_y = thumb_y + thumb_h + this.options.margin;
                }
        }

        // Update tracker size & offset. Show it
        this.$tracker.offset({
            'left': tracker_x,
            'top': tracker_y
        }).css({
            'width': tracker_w,
            'height': tracker_h,
            'visibility': 'visible'
        });

        // Update zoom offset
        this.$zoom.offset({
            'left': zoom_x,
            'top': zoom_y
        });

        // Update big image position
        this.$image.css({
            'left': image_x,
            'top': image_y
        });

        // Finally show zoom window
        this.$zoom.css({
            'width': this.options.width,
            'height': this.options.height,
            'visibility': 'visible'
        });
    };

    Spzoom.prototype.hide = function() {
        this.$zoom.css({'visibility': 'hidden', 'width': 0, 'height': 0});
        this.$tracker.css({'visibility': 'hidden', 'width': 0, 'height': 0});
    };


    Spzoom.prototype.onEnter = function(event) {
        this.x = event.pageX;
        this.y = event.pageY;
        this.render();
    };

    Spzoom.prototype.onMove = function(event) {
        this.x = event.pageX;
        this.y = event.pageY;
        this.render();
    };

    Spzoom.prototype.onOut = function(event) {
        this.hide();
    };

    Spzoom.prototype.onClick = function(event) {
        if (true !== this.hidden) {
            this.hidden = true;
            this.hide();
            return false;
        };
    };

    Spzoom.prototype.onLoad = function() {
        this.state = this.LOADED;
        this.$loader.hide();
        this.render();
    };

    Spzoom.prototype.onLoadError = function() {
        this.state = this.DISABLED;
        console.log('Loading image "' + this.$image.attr('src') + '" failed');
    };
})( jQuery );
