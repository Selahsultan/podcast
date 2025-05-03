///////////////////////////////////////////
// utility functions
///////////////////////////////////////////

function console_log(msg) {
    if ((window['console'] !== undefined))
        console.log(msg);
}

function is_touch_device() {
    return 'ontouchstart' in window // works on most browsers
        ||
        'onmsgesturechange' in window; // works on ie10
}

function wkd_set_cookie(name, value, days) {
    if (days) {
        var date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        var expires = "; expires=" + date.toGMTString();
    } else var expires = "";
    document.cookie = escape(name) + "=" + escape(value) + expires + "; path=/";
}

function wkd_get_cookie(name) {
    var nameEQ = escape(name) + "=";
    var ca = document.cookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) == 0) return unescape(c.substring(nameEQ.length, c.length));
    }
    return null;
}

function wkd_remove_cookie(name) {
    wkd_set_cookie(name, "", -1);
}

function get_human_readable_time(seconds) {
    var time_lengths = [60, 1];
    var output = '';

    for (var s = 0; s < time_lengths.length; s++) {
        var d = Math.floor(seconds / time_lengths[s]);
        var readable = d;
        if (readable < 10)
            readable = '0' + readable;

        if (s > 0)
            output = output + ':';
        output = output + readable;
        seconds -= (d * time_lengths[s]);
    }

    return output;
}

///////////////////////////////////////////
// site functions
///////////////////////////////////////////

function wkd_toggle_menu() {
    jQuery('body').toggleClass('menu_open');
}

function wkd_close_menu() {
    jQuery('body').removeClass('menu_open');
}

function wkd_toggle_buy() {
    $('body').toggleClass('buy_open');
}

function wkd_close_buy() {
    $('body').removeClass('buy_open');
}

function wkd_toggle_search() {
    $('body').toggleClass('search_open');
    if ($('body').hasClass('search_open'))
        $('#search_text').focus();
}

function wkd_close_search() {
    $('body').removeClass('search_open');
}

function wkd_do_search() {
    var search_text = $('#search_text').val();
    if (search_text.match(/^\s*$/))
        return false;

    document.location.href = '/?s=' + encodeURIComponent(search_text);
    return false;
}

$(document).ready(function() {
    // hero sliders
    $('.hero_slider').each(function() {
        $(this).slick({
            infinite: false,
            dots: true,
            arrows: true,
            adaptiveHeight: false,
            autoplay: true,
            autoplaySpeed: 3000,
            speed: 1000,
            slidesToShow: 1,
            slidesToScroll: 1
        });
    });

    $('.hero_slider_custom').each(function() {
        $(this).slick({
            infinite: false,
            dots: true,
            arrows: true,
            adaptiveHeight: false,
            autoplay: true,
            autoplaySpeed: 3000,
            speed: 1000,
            slidesToShow: 1,
            slidesToScroll: 1
        });
    });
    $('.hero_slider_custom .slick-next').each(function() {
        console_log("Overriding next button.");
        $(this).click(function(evt) {
            var slide_num = $('.hero_slider_custom').slick('slickCurrentSlide');
            // if this is the last slide, loop back to the start
            if (slide_num >= wkd_total_features - 1) {
                console_log("Looping to zero.");
                $('.hero_slider_custom').slick('slickGoTo', 0);
            }
        });
    });
    $('.hero_slider_custom .slick-prev').each(function() {
        console_log("Overriding previous button.");
        $(this).click(function(evt) {
            var slide_num = $('.hero_slider_custom').slick('slickCurrentSlide');
            // if this is the last slide, loop back to the start
            if (slide_num <= 0) {
                console_log("Looping to the end.");
                $('.hero_slider_custom').slick('slickGoTo', wkd_total_features - 1);
            }
        });
    });

    // thumbnail sliders
    $('.thumb_slider').each(function() {
        console_log("Initializing thumbnail slider.");
        $(this).slick({
            infinite: false,
            dots: false,
            arrows: true,
            adaptiveHeight: false,
            autoplay: true,
            autoplaySpeed: 3000,
            speed: 1000,
            slidesToShow: 5,
            slidesToScroll: 5
        });
    });
});



///////////////////////////////////////////
// podcast player
///////////////////////////////////////////
var wkd_last_audio_time = 0;
var wkd_last_audio_id = '';
var wkd_last_audio_src = '';
var wkd_audio_reboot = false;
var wkd_timeline_drag = false;
var wkd_timeline_drag_x = 0;
var wkd_audio_playing = null;
var wkd_audio_mouse_y = 0;
var wkd_audio_buffered = 0;

function wkd_render_player(audio_id) {
    var audio = $('#' + audio_id);
    if (!audio) {
        throw new Error("Invalid DOM ID passed to wkd_render_player: " + audio_id);
        return;
    }
    var audio_obj = document.getElementById(audio_id);
    audio_obj.onerror = function(e) {

        console_log("Media error. Attempting to restart...");

        wkd_audio_reboot = true;
        wkd_last_audio_id = this.id;
        wkd_last_audio_src = this.src;
        wkd_last_audio_time = this.currentTime;

        $('#' + wkd_last_audio_id).remove();
        setTimeout(function() {
            console_log("Reloading audio object.");
            $('#' + wkd_last_audio_id + '_player').before(
                $('<audio src="' + wkd_last_audio_src + '" id="' + wkd_last_audio_id + '" class="wkd_player_audio"></audio>')
            );
            setTimeout(function() {
                console_log("Attempting to resume playing.");
                var audio_obj = document.getElementById(wkd_last_audio_id);
                audio_obj.currentTime = wkd_last_audio_time;
                audio_obj.play();
                wkd_audio_reboot = false;

            }, 100);
        }, 200);
    };
    audio_obj.onended = function() {
        wkd_toggle_audio_play(this.id);
    };

    // build the player shell
    var player_id = audio_id + '_player';
    var player = $('<div></div>');
    player.attr('id', player_id).attr('aria-label', 'Podcast Player').attr('data-audio-id', audio_id).addClass('wkd_player');

    // build the play/pause button
    var play_button = $('<div></div>');
    play_button.addClass('play_button mode_pause');
    play_button.attr('data-audio-id', audio_id).attr('aria-controls', audio_id).attr('role', 'button').attr('tabindex', '0').attr('aria-label', 'Play and pause');
    play_button.bind('click keypress', function(evt) {
        if (evt.keyCode || evt.which) {
            var code = evt.keyCode || evt.which;
            if (evt.type != "click" && code != 1 && code != 13 && code != 32)
                return true;
        }

        var audio_id = $(this).attr('data-audio-id');
        var audio_obj = document.getElementById(audio_id);

        // pause any already-playing players
        $('.wkd_player_audio').each(function() {
            var aid = $(this).attr('id');
            if (aid != audio_id) {
                wkd_toggle_audio_play(aid, -1);
            }
        });

        // toggle the targeted player
        wkd_toggle_audio_play(audio_id, audio_obj.paused);
        wkd_audio_playing = audio_obj;
    });
    player.append(play_button);

    // add the time played text
    var time_played = $('<div></div>');
    time_played.addClass('time_played');
    time_played.attr('data-audio-id', audio_id);
    time_played.html('<span>00:00</span>');
    player.append(time_played);

    // add rewind button
    var rewind = $('<div></div>');
    rewind.addClass('rewind');
    rewind.attr('data-audio-id', audio_id).attr('role', 'button').attr('tabindex', '0').attr('aria-label', 'Rewind ten seconds');
    rewind.bind('click keypress', function(evt) {
        if (evt.keyCode || evt.which) {
            var code = evt.keyCode || evt.which;
            if (evt.type != "click" && code != 1 && code != 13 && code != 32)
                return true;
        }

        var audio = document.getElementById(audio_id);
        if (!audio.duration)
            return;

        var updated_time = audio_obj.currentTime - 10;
        if (updated_time < 0)
            updated_time = 0;
        audio_obj.currentTime = updated_time;
    });
    player.append(rewind);

    // add the timeline
    var timeline = $('<div></div>');
    timeline.addClass('timeline');
    timeline.attr('data-audio-id', audio_id);
    var timeline_track = $('<span class="timeline_outer"><span class="timeline_buffered"><span class="timeline_inner"></span></span></span>');
    timeline_track.click(function(e) {
        if (wkd_audio_reboot)
            return;

    });
    timeline_track.mousedown(function(e) {
        wkd_timeline_drag = $(this);
        wkd_set_timeline(wkd_timeline_drag, e.pageX);
        e.stopPropagation();

    });
    timeline_track.mouseout(function(e) {
        if (wkd_timeline_drag) {
            wkd_set_timeline(wkd_timeline_drag, e.pageX);
        }
    });
    timeline.append(timeline_track);
    player.append(timeline);

    // add total-time panel
    var time_total = $('<div></div>');
    time_total.addClass('time_total');
    time_total.attr('data-audio-id', audio_id);
    if (audio.attr('data-audio-time')) {
        time_total.html('<span>' + audio.attr('data-audio-time') + '</span>');
    }
    player.append(time_total);


    // add the volume control
    var volume_block = $('<div></div>');
    volume_block.addClass('volume_toggle volume_on');
    volume_block.attr('data-audio-id', audio_id).attr('role', 'button').attr('tabindex', '0').attr('aria-label', 'Mute');
    volume_block.on('click keypress', function(evt) {
        if (wkd_audio_reboot)
            return;

        if (evt.keyCode || evt.which) {
            var code = evt.keyCode || evt.which;
            if (evt.type != "click" && code != 1 && code != 13 && code != 32)
                return true;
        }

        var audio = document.getElementById(audio_id);
        if (!audio.duration)
            return;

        if ($(this).hasClass('volume_on')) {
            $(this).removeClass('volume_on');
            $(this).addClass('volume_off');
            audio.volume = 0;
        } else {
            $(this).removeClass('volume_off');
            $(this).addClass('volume_on');
            audio.volume = 1;
        }
    });
    player.append(volume_block);

    // build the download button
    var download_file = audio.attr('data-filename');
    var download_url = audio_obj.src;
    var download_target = ' target="_blank" ';
    if (download_url.match(/omny\.fm/i)) {
        download_target = '';
        download_url += '?requestSource=Widget&utm_source=Embed&download=true';
    }
    player.append($('<div class="download"><a ' + download_target + ' href="' + download_url + '" title="Download full audio" download="' + download_file + '"><span>Download</span></a></div>'));
    audio.before(player);

    // if this is a reboot, attempt to move back to where we were in time
    if (wkd_last_audio_time > 0) {
        audio_obj.play();
        audio_obj.currentTime = wkd_last_audio_time;
    }
}

function wkd_set_timeline(timeline_block, mouse_x) {
    var audio_id = timeline_block.parent().attr('data-audio-id');
    var audio = document.getElementById(audio_id);
    var offset = timeline_block.offset();
    var rel_x = mouse_x - offset.left;
    var percent_clicked = rel_x / timeline_block.width();

    if (!audio.duration)
        return;

    // if they're clicking close enough to the start, start over
    if (100 * percent_clicked < 1)
        percent_clicked = 0;
    var new_time = Math.round(audio.duration * percent_clicked);
    if (new_time >= audio.duration)
        new_time = audio.duration;

    wkd_last_audio_time = new_time;
    audio.currentTime = new_time;
    if (new_time >= audio.duration)
        wkd_toggle_audio_play(audio_id);
}

function wkd_toggle_audio_play(audio_id, play) {
    var audio_obj = document.getElementById(audio_id);
    var play_button = $('#' + audio_id + '_player .play_button').first();
    if (audio_obj.volume < 0)
        audio_obj.volume = 1;

    play_button.removeClass('mode_pause');
    play_button.removeClass('mode_play');

    if (play && play != -1 && audio_obj.paused) {
        play_button.addClass('mode_play');
        audio_obj.play();
    } else {
        play_button.addClass('mode_pause');
        audio_obj.pause();
    }
}

function wkd_update_audio_players() {
    if (wkd_audio_reboot)
        return;

    $('.wkd_player_audio').each(function() {
        var audio_id = $(this).attr('id');
        var audio_obj = document.getElementById(audio_id);
        if (audio_obj.duration) {
            var buffered = audio_obj.buffered.end(audio_obj.buffered.length - 1);
            var buffered_percent = (100 * (buffered / audio_obj.duration)).toFixed(2);

            //			var percent_complete	= ( 100 * ( audio_obj.currentTime / audio_obj.duration ) ).toFixed( 2 );
            var percent_complete = (audio_obj.currentTime / audio_obj.duration);
            var percent_width = Math.floor($('#' + audio_id + '_player .timeline_outer').width() * percent_complete);

            $('#' + audio_id + '_player .timeline span.timeline_inner').css({
                'width': '' + percent_width + 'px'
            });

            $('#' + audio_id + '_player .timeline span.timeline_buffered').css({
                'width': '' + buffered_percent + '%'
            });

            var time_played = get_human_readable_time(audio_obj.currentTime);
            var time_total = get_human_readable_time(audio_obj.duration);
            $('#' + audio_id + '_player .time_played').html('<span>' + time_played + '</span>');
            $('#' + audio_id + '_player .time_total').html('<span>' + time_total + '</span>');
            if (audio_obj.currentTime >= audio_obj.duration)
                wkd_toggle_audio_play(audio_id);

        }
    });
}

function wkd_bind_player_input() {
    /*
    $(document).keypress( function( e ) {
    	if ( e.charCode == KEY_CODE_SPACE && wkd_audio_playing != null )
    	{
    		wkd_toggle_audio_play( wkd_audio_playing.id, wkd_audio_playing.paused );
    	}
    } );
    */
    $(document).mousemove(function(e) {
        if (wkd_timeline_drag) {
            wkd_set_timeline(wkd_timeline_drag, e.pageX);
            e.stopPropagation();
        }
    });
    $(document).mouseup(function(e) {
        if (wkd_timeline_drag) {
            wkd_set_timeline(wkd_timeline_drag, e.pageX);
            wkd_timeline_drag = null;
            e.stopPropagation();
        }
    });

}

$(function() {

    var player_found = false;
    $('.wkd_player_audio').each(function() {
        //		console_log( "Found player: " + $(this).attr('id') );
        player_found = true;
        wkd_render_player($(this).attr('id'));
    });

    if (player_found)
        wkd_bind_player_input();
});

var wkd_player_updates = setInterval("wkd_update_audio_players()", 250);

function wkd_series_links(id) {
    wkd_close_series_links();
    var series_links = $('#series_links_' + id);
    series_links.detach();
    $('body').append(series_links);
    $('body').addClass('series_open');
    series_links.addClass('series_links_open');
}

function wkd_close_series_links() {
    $('.series_links').each(function() {
        $(this).removeClass('series_links_open');
    });
    $('body').removeClass('series_open');
}

function wkd_expand_transcript(button) {
    if ($('#transcript_inner').hasClass('expanded')) {
        $('#transcript_inner').css('height', '650px').removeClass('expanded');
        $(button).html("Read full Transcript");
    } else {
        $('#transcript_inner').css('height', 'auto').addClass('expanded');
        $(button).html("Collapse Transcript");
    }
}

// cookie notification pop-up
function wkd_pop_cookie_note(force) {
    var note_popped = wkd_get_cookie('fre_cookie_note_2023');
    if (note_popped && !force) {
        $('#fre_cookie_modal').hide();
    } else {
        $('#fre_cookie_modal').css({
            display: "block"
        });
        setTimeout(function() {
            $('body').addClass('cookie_note_popped');
        }, 100);
    }
}

function wkd_hide_cookie_note() {
    $('body').removeClass('cookie_note_popped');
}

function wkd_set_cookie_note() {
    wkd_set_cookie('fre_cookie_note_2023', '1', 730);
    $('body').removeClass('cookie_note_popped');
}

$(document).ready(function() {
    $('.payment-form-plan-list .sc-plan-selector__mp-tier-label').each(function() {
        // monthly
        console.log('For: ' + $(this).attr('for'));
        var plan = $(this).attr('for');
        if (plan == 'plan-8939' || plan == 'plan-9259') {
            $(this).html('<img src="/wp-content/themes/freakonomics_2021/images/plus_button_monthlyb.png" alt="Monthly plan">');

            // annually
        } else if (plan == 'plan-8938' || plan == 'plan-9258') {
            $(this).html('<img src="/wp-content/themes/freakonomics_2021/images/plus_button_annualb.png" alt="Annual plan">');

        }
    });
});