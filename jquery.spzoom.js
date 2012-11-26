/**
 * spzoom - simple jQuery image zoomer
 *
 * version: 0.1.0 (24/11/2012)
 * author: Sebatian Pająk
 *
 */

(function($) {
    $.fn.spzoom = function(options) {
        var settings = $.extend({
            width:       250,              // Zoom window width
            height:      250,              // Zoom window height
            position:    'right',          // top, right, bottom, left
            margin:      20,               // Zoom window margin (space)
            cursor:      'crosshair',      // Cursor name or null
            title:       'bottom',         // top, bottom, off
            error:       'Loading error!', // Error message or null
            min_tracker: 15                // Minimal tracker dimensions
        }, options);

        return this.each(function() {
            if (this.tagName.toLowerCase() == 'a') {
                new spzoom($(this), settings);
            }
        });
    };

    function spzoom(el, settings) {
        var data = el.data('spzoom');
        // If our object exists, no need to create another instance
        if (data) {
            return data;
        }
        el.data('spzoom', this);

        var thumb = $("img", el).first();


        var image;

        var zoom;

        var tracker;

        var title;

        var loader;

        var over = false;

        const PENDING = 0;
        const LOADING = 1;
        const LOADED  = 2;

        var state = PENDING;

        // Cursor offset
        var x = 0;
        var y = 0;

        // Zoom area dimensions
        var w = settings.width;
        var h = settings.height;


		var init = function() {
            // Thumb required style
            thumb.css('vertical-align','top');

		    // Make anchor our container
		    el.css({
		        'cursor': settings.cursor,
		        'position': 'relative',
		        'text-decotarion': 'none',
		        'outline-style': 'none'
		    });

            // Create image element
            image = $('<img style="display:block;position:relative;left:0;top:0;z-index:99" alt="spzoom image"/>');

            // Construct main layers
            zoom    = $('<div class="spzoom-zoom"></div>');
            tracker = $('<div class="spzoom-tracker"></div>');

            zoom.css({
                'position': 'absolute',
                'top': 0,
                'left': 0,
                'overflow': 'hidden',
                'visibility': 'hidden',
                'padding': 0,
                'display': 'block',
                'width': w,
                'height': h
            });

            tracker.css({
                'position': 'absolute',
                'top': 0,
                'left': 0,
                'padding': 0,
                'margin': 0,
                'visibility': 'hidden',
                'z-index': '100',
                'display': 'block',
                'border-width': '1px',
                'border-style': 'solid',
                'opacity': 0.5,
            });

            // Setup loader
            loader = $('<div class="spzoom-loader"></div>');
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
                    title = $('<div class="spzoom-title"></div>');
                    title.text(value).css({
                        'position': 'absolute',
                        'z-index': '100',
                        'left': 0,
                        'right': 0,
                        'opacity': 0.75
                    });

                    title.css( (settings.title == 'top' ? {'top':0} : {'bottom':0}) );
                    zoom.append(title);
                }
            }

            el.append(loader);
            el.append(tracker);
            el.append(zoom);

            el.mouseover(function(e){ onEnter(e); });
            el.mouseout(function(e){ onOut(e); });
            el.mousemove(function(e){ onMove(e); });
		};

        function doShowLoader() {
            var x0 = thumb.offset().left + (thumb.width() - loader.outerWidth())/2;
            var y0 = thumb.offset().top + (thumb.height() - loader.outerHeight())/2;

            loader.show().offset({
                'left': x0,
                'top':  y0,
            }).css('visibility', 'visible');
        }

        function onLoad() {
            state = LOADED;
            loader.hide();
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

            // Do render as normal
            if (state === LOADED) {
                doRender();
                return;
            }

            // If this is the first time we enter here
            if (state === PENDING) {
                state = LOADING;
                doShowLoader();

                // Append the image and wait for load event
                image.one('load', function(){ onLoad(); });
                image.one('error', function(){ onError(); });
                image.attr('src', el.attr('href'));
                zoom.append(image);

                // Load event may not fire if the image goes from browser cache
                if (image.prop('complete')) {
                    image.load();
                }
            }
        };

        function onOut(e) {
            over = false;
            zoom.css({'visibility':'hidden'});
            tracker.css({'visibility':'hidden'});
        };

        function onMove(e) {
            x = e.pageX;
            y = e.pageY;
            doRender();
        };

        function doRender() {
            if (over && state === LOADED) {
                var thumb_w = thumb.width();
                var thumb_h = thumb.height();
                var thumb_x = thumb.offset().left;
                var thumb_y = thumb.offset().top;

                // Calculate the scale
                var scale_x = thumb_w/image.width();
                var scale_y = thumb_h/image.height();

                // Calculate tracker size
                var tw = w * scale_x;
                var th = h * scale_y;

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
                        'width':   tw-2, // make space for solid 1px border
                        'height':  th-2,
                        'visibility': 'visible'
                    });
                }

                // Set zoom offset
                switch (settings.position) {
                    case 'top':
                        zoom.offset({
                            'left': thumb_x,
                            'top':  thumb_y - h - settings.margin
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
                        zoom.offset({
                            'left': thumb_x + thumb_w + settings.margin,
                            'top':  thumb_y
                        });
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
                zoom.css({'visibility': 'visible'});
            }
        };


        if (thumb.prop('complete')) {
            init();
        }
        else {
            thumb.one('load', function(){ init(); });
        }
    };
})( jQuery );
