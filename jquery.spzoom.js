/**
 * spzoom - simple jQuery image zoomer
 *
 * version: 0.2.0 (26/04/2016)
 * author: Sebatian Pająk
 *
 */

(function($) {
    $.fn.spzoom = function(options) {
        return this.each(function() {
            if (this.tagName.toLowerCase() == 'a' && this.getAttribute("href")) {
                if (!$.data(this, 'plugin_spzoom')) {
                    $.data(this, 'plugin_spzoom', new spzoom($(this), options));
                }
            }
        });
    };

    function spzoom(el, options) {
        this.defaults = {
            width: 250,
            height: 250,
            position:    'right',          // top, right, bottom, left
            margin:      20,               // Zoom window margin (space)
            cursor:      'crosshair',      // Cursor name or null
            title:       'bottom',         // top, bottom, off
            error:       'Loading error!', // Error message or null
            min_tracker: 15                // Minimal tracker dimensions
        };
        this.options = $.extend({}, this.defaults, options);
/*
        for (var option in this.data()) {
            if (prefix.length < option.length) {
                if (0 === option.indexOf(prefix)) {
                    var name = option.substr(prefix.length).toLowerCase();
                    options[name] = this.data(option);
                }
            }
        }
*/
        var settings = this.options;
        var thumb = $("img", el).first();

        // spzoom containers
        var image = $('<img class="spzoom-image"/>');
        var imageWrapper = $('<div class="spzoom-image-wrapper"/>');
        var zoom = $('<div class="spzoom-zoom"/>');
        var tracker = $('<div class="spzoom-tracker"/>');
        var title = $('<div class="spzoom-title"/>');
        var loader = $('<div class="spzoom-loader"/>');

        // This flag is true if mouse is over the thumb
        var over = false;

        // This flag is true zoom should be disabled (zoom is not needed)
        var disabled = false;

        // Big image loading state
        var PENDING = 0;
        var LOADING = 1;
        var LOADED  = 2;

        var state = PENDING;

        // Cursor offset
        var x = 0;
        var y = 0;

        // Zoom area dimensions
        var w = settings.width;
        var h = settings.height;

        el.css({
            'cursor': settings.cursor,
            'position': 'relative',
            'text-decotarion': 'none',
            'outline-style': 'none'
        });

        el.mouseover(function(e){ onEnter(e); });
        el.mouseout(function(e){ onOut(e); });
        el.mousemove(function(e){ onMove(e); });
        el.click(function(e){ onClick(e); });

        var init = function() {
            image.css({
                'display': 'block',
                'border': '0 none',
                'position': 'relative',
                'left': 0,
                'top': 0
            });

            imageWrapper.css({
                'position': 'relative',
                'left': 0,
                'top': 0,
                'overflow': 'hidden'
            });

            zoom.css({
                'position': 'absolute',
                'top': 0,
                'left': 0,
                'overflow': 'hidden',
                'visibility': 'hidden',
                'display': 'block',
                'width': 0,
                'height': 0
            });

            tracker.css({
                'position': 'absolute',
                'top': 0,
                'left': 0,
                'width': 0,
                'height': 0,
                'visibility': 'hidden'
            });

            loader.css({
                'display': 'none',
                'position': 'absolute',
                'left': 0,
                'top': 0,
                'visibility': 'hidden',
                'opacity': 0.6
            });

            // Set title area
            if (settings.title != 'off') {
                var value = el.attr('title');
                if (value) {
                    title.text(value).css({
                        'position': 'absolute',
                        'z-index': '100',
                        'left': 0,
                        'right': 0,
                        'opacity': 0.75
                    });

                    title.css( (settings.title == 'top' ? {'top': 0} : {'bottom': 0}) );
                    zoom.append(title);
                }
            }

            zoom.append(imageWrapper);
            el.append(loader);
            el.append(tracker);
            el.append(zoom);
		};

        function doShowLoader() {
            var x0 = thumb.offset().left + (thumb.width() - loader.outerWidth())/2;
            var y0 = thumb.offset().top + (thumb.height() - loader.outerHeight())/2;

            loader.show().offset({
                'left': x0,
                'top':  y0
            }).css('visibility', 'visible');
        }

        function onLoad() {
            state = LOADED;
            loader.hide();

            // Check image dimensions
            if (thumb.width() >= image.width() || thumb.height() >= image.height()) {
                disabled = true;
                return;
            }

            // Show the widgets
            doRender();
        };

        function onError() {
            if (settings.error) {
                loader.addClass('spzoom-loader-error').text(settings.error);
                doShowLoader();
            }
            else {
                loader.hide();
            }
        };

        function onEnter(e) {
            over = true;
            x = e.pageX;
            y = e.pageY;

            // If this is the first time we enter here
            if (state === PENDING && thumb.prop('complete')) {
                state = LOADING;
                init();
                doShowLoader();

                // Append the image and wait for load event
                image.one('load', function(){ onLoad(); });
                image.one('error', function(){ onError(); });
                image.attr('src', el.attr('href'));
                imageWrapper.append(image);

                // Load event may not fire if the image goes from browser cache
                if (image.prop('complete')) {
                    image.load();
                }
                return;
            }
            doRender();
        };

        function onOut(e) {
            over = false;
            zoom.css({'visibility':'hidden', 'width':0, 'height':0});
            tracker.css({'visibility':'hidden'});
        };

        function onMove(e) {
            x = e.pageX;
            y = e.pageY;
            doRender();
        };

        function onClick(e) {
            zoom.css({'visibility':'hidden', 'width':0, 'height':0});
            tracker.css({'visibility':'hidden'});
        };

        function doRender() {
            if (over && state === LOADED && !disabled) {
                var thumb_w = thumb.width();
                var thumb_h = thumb.height();
                var thumb_x = thumb.offset().left;
                var thumb_y = thumb.offset().top;

                // Calculate the scale
                var scale_x = thumb_w/image.width();
                var scale_y = thumb_h/image.height();

                // Calculate tracker size
                var tw = Math.min(w * scale_x, thumb_w);
                var th = Math.min(h * scale_y, thumb_h);

                // Calculate tracker offset.
                // Make sure tracker is inside thumb rectangle
                var tx = Math.min(Math.max(x - tw/2, thumb_x), thumb_x + thumb_w - tw);
                var ty = Math.min(Math.max(y - th/2, thumb_y), thumb_y + thumb_h - th);

                // Dont show tracker if dimensions are too small
                if (tw > settings.min_tracker && th > settings.min_tracker) {
                    // Update tracker size & offset. Show it
                    tracker.offset({
                        'left': tx,
                        'top':  ty
                    }).css({
                        // make space for solid 1px border in non border-box model
                        // 'width':   tw-2,
                        // 'height':  th-2,
                        'width':   tw,
                        'height':  th,
                        'visibility': 'visible'
                    });
                }

                // Set zoom offset
                switch (settings.position) {
                    case 'top':
                        zoom.offset({
                            'left': thumb_x,
                            'top':  thumb_y - h - settings.margin,
                        }); break;
                    case 'bottom':
                        zoom.offset({
                            'left': thumb_x,
                            'top':  thumb_y + thumb_h + settings.margin
                        }); break;
                    case 'left':
                        zoom.offset({
                            'left': thumb_x - w - settings.margin,
                            'top':  thumb_y
                        }); break;
                    default: // default is right
                        var left = thumb_x + thumb_w + settings.margin;
                        if ($(document).width() >= left + w) {
                            zoom.offset({
                                'left': left,
                                'top':  thumb_y
                            });
                        } else {
                            zoom.offset({
                                'left': thumb_x - (w - thumb_w),
                                'top':  thumb_y + thumb_h + settings.margin
                            });
                        }
                }

                // Scale coordinates for big image
                var bx = ((tx - thumb_x)/scale_x) * (-1);
                var by = ((ty - thumb_y)/scale_y) * (-1);

                // Update big image position
                image.css({
                    'left': bx,
                    'top':  by
                });

                // Finally show zoom window
                zoom.css({
                    'width': w,
                    'height': h,
                    'visibility': 'visible'
                });
            }
        };
    };
})( jQuery );
