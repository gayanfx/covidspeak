// TODO: auto-close room after 12 hours
// TODO: If room_id starts with x and is lost, this is probably
// not a valid room...
var mirror_type = location.href.match(/mirror/);
var teaching_type = location.href.match(/teach/);
var add_dom = function(elem, track, user) {
  if(elem.tagName == 'AUDIO') {
    var analyser = input.track_audio(elem, track, user);
    if(analyser) {
      analyser.for_volume = true;
    }
  }
  elem.classList.add("room-" + track.type);
  elem.setAttribute('data-track-id', track.id);
  elem.setAttribute('data-user-id', user.id);
  document.getElementById('partner').prepend(elem);
  if(track.type == 'video') {
    elem.addEventListener('resize', function() {
      room.size_video();
    })
    setTimeout(function() {
      room.size_video();
    }, 500);
    room.current_video_id = track.id;
  }
}
remote.addEventListener('track_added', function(data) {
  var track = data.track;
  room.all_remote_tracks = room.all_remote_tracks || [];
  room.all_remote_tracks.push({type: track.type, id: track.id, user_id: data.user_id, mediaStreamTrack: track.mediaStreamTrack});
  if(track.generate_dom) {
    console.log("adding remote track", track);
    if(track.type == 'video' || (track.type == 'audio' && track.version_id)) { //} || track.type == 'audio') {
      // Right now we allow multiple audio tracks, so you
      // can talk to someone while showing them a video
      var elems = document.getElementById('partner').getElementsByClassName("room-" + track.type);
      var priors = [];
      if(track.version_id) {
        for(var idx = 0; idx < elems.length; idx++) {
          if(elems[idx].getAttribute('data-version-id') != track.verison_id) {
            priors.push(elems[idx]);
          }
        }
      } else {
        priors = elems;
      }
      for(var idx = 0; idx < priors.length; idx++) {
        if(priors[idx].getAttribute('data-user-id') == data.user_id) {
          priors[idx].parentNode.removeChild(priors[idx]);
        } else {
          priors[idx].style.display = 'none';
        }
      }
    }
    var dom = track.generate_dom();
    dom.classList.add('track-' + track.id);
    dom.setAttribute('data-version-id', track.version_id);
    add_dom(dom, data.track, data.user);  
  } else {
    console.log("remote track added with no DOM", track);
  }
});

remote.addEventListener('track_removed', function(data) {
  var track = data.track;
  room.all_remote_tracks = (room.all_remote_tracks || []).filter(function(t) { return t.type != track.type || t.id != track.id || t.user_id != data.user_id; });

  var elems = document.getElementById('partner').getElementsByClassName('track-' + track.id);
  var found = false;
  for(var idx = 0; idx < elems.length; idx++) {
    console.log("removing remote track", elems[idx]);
    elems[idx].parentNode.removeChild(elems[idx]);
    found = true;
  }
  if(track.type == 'video') {
    var priors = document.getElementById('partner').getElementsByClassName("room-" + track.type);
    for(var idx = 0; idx < priors.length; idx++) {
      if(priors[idx].getAttribute('data-user-id') == data.user_id) {
        priors[idx].parentNode.removeChild(priors[idx]);
      }
    }
    if(data.newest_other) {
      add_dom(data.newest_other.generate_dom(), data.track, data.user);
    }
  }
});
remote.addEventListener('room_empty', function(data) {
  room.status('No One is Here', {invite: true});
  room.active = false;
});
remote.addEventListener('user_added', function(data) {
  // TODO: keep a rotation of helpers for the communicator,
  // and keep communicators on everyone else's view
  if(data.user.id != room.current_room.user_id) {
    if(!room.active) {
    }
    room.active_users = room.active_users || {};
    room.set_active(true);
    room.status('ready');
    if(!room.active_users[data.user.id]) {
      input.play_sound('/sounds/enter.mp3');
    }
    if(document.querySelector('.modal #invite_modal')) {
      // close invite modal when partner enters
      modal.close();
    }
    room.active_users[data.user.id] = (new Date()).getTime();
  }
  setTimeout(function() {
    room.send_update();
  }, 500);
});
remote.addEventListener('user_removed', function(data) {
  room.user_left(data.user);
});
remote.addEventListener('connection_error', function(data) {
  if(!room.active) {
    room.status('Having Some Trouble...', {invite: true});
  }
});
remote.addEventListener('message', function(data) {
  room.handle_message(data);
});
// TODO: https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/captureStream
var zoom_factor = 1.1;
var reactions = [
  {text: "laugh", url: "https://d18vdu4p71yql0.cloudfront.net/libraries/twemoji/1f602.svg"},
  {text: "sad", url: "https://d18vdu4p71yql0.cloudfront.net/libraries/twemoji/1f622.svg"},
  {text: "kiss", url: "https://d18vdu4p71yql0.cloudfront.net/libraries/twemoji/1f618.svg"},
  {text: "heart eyes", url: "https://d18vdu4p71yql0.cloudfront.net/libraries/twemoji/1f60d.svg"},
  {text: "party", url: "https://d18vdu4p71yql0.cloudfront.net/libraries/twemoji/1f973.svg"},
  {text: "thumbs up", url: "https://d18vdu4p71yql0.cloudfront.net/libraries/twemoji/1f44d.svg"},
  {text: "rose", url: "https://d18vdu4p71yql0.cloudfront.net/libraries/twemoji/1f339.svg"},
  {text: "heart", url: "https://d18vdu4p71yql0.cloudfront.net/libraries/twemoji/2764.svg"},
  {text: "pray", url: "https://d18vdu4p71yql0.cloudfront.net/libraries/twemoji/1f64f-1f3fe.svg"},
  {text: "clap", url: "https://d18vdu4p71yql0.cloudfront.net/libraries/twemoji/1f44f-1f3fd.svg"},
  {text: "tired", url: "https://d18vdu4p71yql0.cloudfront.net/libraries/twemoji/1f634.svg"},
  {text: "mad", url: "https://d18vdu4p71yql0.cloudfront.net/libraries/twemoji/1f621.svg"},
  {text: "barf", url: "https://d18vdu4p71yql0.cloudfront.net/libraries/twemoji/1f92e.svg"},
  {text: "rolling eyes", url: "https://d18vdu4p71yql0.cloudfront.net/libraries/twemoji/1f644.svg"},
  {text: "shrug", url: "https://d18vdu4p71yql0.cloudfront.net/libraries/twemoji/1f937-200d-2640-fe0f.svg"},
];

var room = {
  size_video: function(reset) {
    // TODO: videos have resize event?!?!
    var height = window.innerHeight - 30;
    var grid = document.getElementsByClassName('grid')[0];
    if(!grid) { return; }
    var buttons = grid.getElementsByClassName('button');
    for(var idx = 0; idx < buttons.length; idx++) {
      if(height / 5 < 100) {
        buttons[idx].style.height = (height / 5) + 'px';
      } else {
        buttons[idx].style.height = '';
      }
    }
    var box = document.getElementById('partner');
    if(box) {
      var list = [];
      for(elem of box.getElementsByTagName('VIDEO')) {
        list.push(elem);
      }
      list.forEach(function(elem) {
        var rect = box.getBoundingClientRect();
        var bw = rect.width;
        var bh = rect.height;
        var vw = elem.videoWidth;
        var vh = elem.videoHeight;  
        if(!vw || !vh) { return; }
        if(!room.manual_zoom && (room.last_video_width < vw || room.last_video_height < vh)) {
          // TODO: better math here. If you would have needed
          // to move the video element before but not you don't,
          // then re-calculate unless it was a manual zoom
          console.log("RESET AUTO ZOOM");
          reset = true;
        }
        room.last_video_width = vw;
        room.last_video_height = vh;
        if(reset) { room.zoom_level = null; }
        var zoom = room.zoom_level || 1.0;
    
        var xscale = bw / vw;
        var yscale = bh / vh;
        var scale = Math.max(xscale, yscale);
        if(!room.manual_zoom && vw > 10 && vh > 10 && vw * xscale * zoom < bw && vh * yscale * zoom < bh) {
          console.log("AUTO ZOOM", vw, vh, zoom);
          room.zoom_level = zoom * zoom_factor;
          // vw or vh is probably zero
          if(room.zoom_level > 10) { debugger }
          return room.size_video();
        }
        elem.style.width = (vw * scale * zoom) + "px";
        elem.style.height = (vh * scale * zoom) + "px";
        var fudge_x = (((vw * scale * zoom) - bw) / -2);
        var fudge_y = (((vh * scale * zoom) - bh) / -2);
        var shift_x = 0;
        var shift_y = 0;
        if(room.shift_x && fudge_x < 0) {
          shift_x = Math.max(Math.min(room.shift_x || 0, -1 * fudge_x), fudge_x);
        }
        if(room.shift_y && fudge_y < 0) {
          shift_y = Math.max(Math.min(room.shift_y || 0, -1 * fudge_y), fudge_y);  
        }
        elem.style.marginLeft = (fudge_x + shift_x) + "px";
        elem.style.marginTop = (fudge_y + shift_y) + "px";  
      });  
    }
  },
  status: function(str, opts) {
    document.querySelector('#status_invite').style.display = 'none';
    document.querySelector('#status_popout').style.display = 'none';
    document.querySelector('#status_continue').style.display = 'none';
    document.querySelector('#status').style.display = 'block';
    if(opts && opts.big) {
      document.querySelector('#status').classList.add('big');
    } else {
      document.querySelector('#status').classList.remove('big');
    }
    if(!str || str == 'ready') {
      document.querySelector('#status_holder').style.display = 'none';
    } else {
      document.querySelector('#status_holder').style.display = 'block';
      document.querySelector('#status').innerText = str;
      if(room.current_room && room.current_room.room_initiator) {
        if(opts && opts.invite && !mirror_type && !teaching_type) {
          document.querySelector('#status_invite').style.display = 'block';
        }
      }
      if(opts && opts.continue && opts.callback) {
        document.querySelector('#status_continue').style.display = 'block';
        room.video_continue = function() {
          room.video_continue = null;
          opts.callback();
        }
      }
      if(opts && opts.popout) {
        document.querySelector('#status_popout').style.display = 'block';
      }
    }
  },
  flip_video: function() {
    // TODO: transform: scaleX(-1);
  },
  set_active: function(set) {
    if(room.active_timeout || mirror_type || teaching_type) { return; }
    var resume = function() {
      room.active_timeout = setTimeout(function() {
        room.active_timeout = null;
        room.set_active();
      }, 40000 + Math.round(Math.random() * 40000)); // add jitter
    };
    if(set) {
      room.active = true;
    }
    if(room.active) {
      var data = {user_id: room.current_user_id};
      if(!room.active && room.current_room.room_initiator) {
        data.empty = true;
      }
      if(input.compat) {
        data.system = input.compat.system;
        data.browser = input.compat.browser;
        data.mobile = !!input.compat.mobile;
      }
      session.ajax('/api/v1/rooms/' + room.room_id + '/keepalive', {
        method: 'POST',
        data: data
      }).then(function(res) {
        resume();
      }, function(err) {
        resume();
      });
    } else {
      setTimeout(room.set_active, 15000);
    }
  },
  toggle_self_mute: function(mute) {
    var previous_mute = !!room.mute_audio;
    room.mute_audio = !previous_mute;
    if(mute === false || mute === true) {
      room.mute_audio = mute;
    }
    var audio_tracks = room.local_tracks.filter(function(t) { return t.type == 'audio'; });
    if(previous_mute != room.mute_audio && audio_tracks.length > 0) {
      if(room.mute_audio) {
        audio_tracks.forEach(function(t) { t.mediaStreamTrack.enabled = false; });
        // remote.remove_local_track(room.current_room.id, audio_track, true);
        document.querySelector('#nav').classList.add('muted');
        document.querySelector('#communicator').classList.add('muted');
      } else {
        audio_tracks.forEach(function(t) { 
          remote.add_local_tracks(room.current_room.id, t);
          t.mediaStreamTrack.enabled = true; 
        });
        document.querySelector('#nav').classList.remove('muted');
        document.querySelector('#communicator').classList.remove('muted');
      }
    }
    room.send_update();
  },
  send_key: function(char) {
    // keyboard entry state should be shared, should allow keyboard entry
  },
  end_share: function() {
    if(room.share_tracks && room.share_tracks.length) {
      if(room.share_tracks.container && room.share_tracks.container.parentNode) {
        room.share_tracks.container.parentNode.removeChild(room.share_tracks.container);
      }
      var track_ids = {};
      room.priority_tracks = null;
      room.share_tracks.forEach(function(track) {
        track_ids[track.id] = true;
        remote.remove_local_track(room.current_room.id, track);
      });
      room.local_tracks = (room.local_tracks || []).filter(function(t) { return !track_ids[t.id]; });
      room.share_tracks = null;
      room.update_preview();
    }
  },
  share_screen: function() {
    room.end_share();
    if(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
      navigator.mediaDevices.getDisplayMedia({
        video: true,
        cursor: 'motion',
        displaySurface: 'monitor'
      }).then(function(stream) {
        room.priority_tracks = stream.getTracks();
        remote.add_local_tracks(room.current_room.id, stream).then(function(tracks) {
          var track = tracks.find(function(t) { return t.type == 'video'; });
          if(track.generate_dom) {
            var elem = track.generate_dom();
            room.update_preview(elem);
          }
          room.share_tracks = tracks;
          room.local_tracks.push(track);
        });

      }, function(err) {
        console.error("screen share failed", err);
      });
    }
    // TODO: publish screen share stream
  },
  share_image: function() {
    if(room.share_tracks && room.share_tracks.share_pic) {
      return room.share_tracks.share_pic();
    }
    room.end_share();
    var div = document.createElement('div');
    var canvas = document.createElement('canvas');
    var video = document.querySelector('#communicator video');
    canvas.width = (video || {}).videoWidth || 1280;
    canvas.height = (video || {}).videoHeight || 720;
    div.appendChild(canvas);
    var context = canvas.getContext('2d');
    context.fillStyle = 'black';
    var initialized = false;
    context.fillRect(0, 0, canvas.width, canvas.height);
    var find_pic = function() {
      var file = div.querySelector('input');
      if(!file) {
        file = document.createElement('input');
        file.type = 'file';
        file.accept = "image/*";
        div.appendChild(file);  
        file.onchange = function(event) {
          var file = event.target && event.target.files && event.target.files[0];
          var draw_img = function(img) {
            if(!room.share_tracks) { return; }
            if(room.share_tracks.img && room.share_tracks.img != img) {
              return;
            }
            room.share_tracks.img = img;
            var cw = canvas.width;
            var ch = canvas.height;
            var iw = img.width;
            var ih = img.height;  
            var xscale = cw / iw;
            var yscale = ch / ih;
            var scale = Math.max(xscale, yscale);
            context.fillStyle = 'black';
            context.fillRect(0, 0, canvas.width, canvas.height);
            context.drawImage(img, 0, 0, iw * scale, ih * scale);
            // Sometimes it doesn't show up on the first load for remote users
            setTimeout(function() {
              draw_img(img);
            }, 100);
          };
          var draw = function() {
            context.fillStyle = 'black';
            context.fillRect(0, 0, canvas.width, canvas.height);
            if(file && file.type.match(/^image/)) {
              var reader = new FileReader();
              reader.addEventListener('load', function() {
                file.value = null;
                var img = new Image();
                img.onload = function() {
                  draw_img(img);
                };
                img.src = reader.result;
              });
              reader.readAsDataURL(file);
            }
          };
          if(!initialized) {
            initialized = true;
            document.body.appendChild(div);
            var stream = canvas.captureStream();
            room.priority_tracks = stream.getTracks();
            remote.add_local_tracks(room.current_room.id, stream).then(function(tracks) {
              var track = tracks.find(function(t) { return t.type == 'video'; });
              track.canvas = canvas;
              track.share_pic = find_pic;
              if(track.generate_dom) {
                var elem = track.generate_dom();
                room.update_preview(elem);
              }
              room.share_tracks = tracks;
              tracks.share_pic = find_pic;
              tracks.container = div;
              room.local_tracks.push(track);
              setTimeout(function() {
                draw();
              }, 1000);
            });
          } else {
            draw();
          }
        };
      }
      file.click();
    };
    find_pic();
  },
  update_preview: function(elem, playable) {
    var communicator = document.querySelector('#communicator');
    communicator.innerHTML = '';
    document.querySelector('#communicator').classList.remove('pending');
    if(elem) {
      communicator.appendChild(elem);
      var end_share = document.createElement('div');
      end_share.classList.add('end_share');
      communicator.appendChild(end_share);
      communicator.classList.add('preview');
      if(playable) {
        communicator.classList.add('playable');
        communicator.classList.remove('paused');
      }
    } else {
      communicator.classList.remove('preview');
      communicator.classList.remove('playable');
      communicator.classList.remove('paused');
      var vid = room.local_tracks.find(function(t) { return t.type == 'video' && t.mediaStreamTrack.enabled; });
      if(vid && vid.generate_dom) {
        communicator.appendChild(vid.generate_dom());
      } else {
        var div = document.createElement('div');
        var img = document.createElement('img');
        img.src = '/icons/person-square.svg';
        div.classList.add('nobody');
        div.appendChild(img);
        communicator.appendChild(div);
        // TODO: show a placeholder picture instead
      }
    }
    room.send_update();
  },
  toggle_video: function(rewind) {
    var video = room.share_tracks && room.share_tracks.video;
    if(video) {
      if(rewind) {
        video.currentTime = 0;
        video.play();
      } else if(!video.ended) {
        if(video.paused && video.currentTime > 0) {
          video.play();
          document.querySelector('#communicator').classList.remove('paused');
        } else {
          video.pause();
          document.querySelector('#communicator').classList.add('paused');
        }
      }
    }
  },
  share_video: function() {
    // https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Manipulating_video_using_canvas
    // https://developers.google.com/web/updates/2016/10/capture-stream
    room.end_share();
    var div = document.createElement('div');
    var video_elem = document.createElement('video');
    if(!(video_elem.captureStream || video_elem.mozCaptureStream)) {
      alert('not supported');
      return;  
    }
    var video = document.querySelector('#communicator video');
    div.appendChild(video_elem);
    var find_vid = function() {
      var file = div.querySelector('input');
      if(!file) {
        file = document.createElement('input');
        file.type = 'file';
        file.accept = "video/*";
        div.appendChild(file);  
        file.onchange = function(event) {
          var file = event.target && event.target.files && event.target.files[0];
          if(file && file.type.match(/^video/)) {
            video_elem.onloadeddata = function() {
              var stream = null;
              if(video_elem.captureStream) {
                stream = video_elem.captureStream();
              } else if(video_elem.mozCaptureStream) {
                stream = video_elem.mozCaptureStream();
              }
              room.priority_tracks = stream.getTracks();
              remote.add_local_tracks(room.current_room.id, stream).then(function(tracks) {
                var track = tracks.find(function(t) { return t.type == 'video'; });
                track.container = div;
                track.share_vid = find_vid;
                if(track.generate_dom) {
                  var elem = track.generate_dom();
                  room.update_preview(elem, true);
                }
                room.share_tracks = tracks;
                tracks.container = div;
                tracks.video = video_elem;
                room.local_tracks.push(track);
                setTimeout(function() {
                  video_elem.play();
                }, 1000);
              });
            };
            var url = URL.createObjectURL(file);
            video_elem.src = url;
            file.value = null;
            video_elem.load();
          }
          document.body.appendChild(div);
        };
      }
      file.click();
    };
    find_vid();
  },
  zoom: function(zoom_in) {
    room.manual_zoom = true;
    room.zoom_level = (room.zoom_level || 1.0);
    if(zoom_in) {
      room.zoom_level = room.zoom_level * zoom_factor;
    } else {
      room.zoom_level = room.zoom_level / zoom_factor;
    }
    room.size_video();
  },
  assert_grid: function(buttons, id, locale, root, skip_send) {
    var now = (new Date()).getTime();
    room.buttons = buttons.map(function(b) {
      return room.simple_button(b);
    });
    room.board_locale = locale;
    room.grid_id = id;
    room.buttons.set_at = now;
    if(root) {
      room.root_id = room.grid_id;
    }
    room.asserted_buttons = {
      set_at: now,
      grid_id: id,
      root_id: room.root_id,
      symbol_library: room.settings.symbol_library,
      locale: locale,
      buttons: room.buttons
    };
    if(!skip_send) {
      room.send_update();
    }
    room.show_grid();
  },
  send_image: function(image_url, alt) {
    if(!mirror_type) {
      room.show_image(image_url, alt, false);
    }
    if(!room.current_room) { return; }
    remote.send_message(room.current_room.id, {
      from_communicator: room.current_room.as_communicator,
      action: 'image',
      url: image_url,
      text: alt
    }).then(null, function() { 
      // send failed...
    });
  },
  send_update: function() {
    if(room.update_timeout) {
      clearTimeout(room.update_timeout);
      room.update_timeout = null;
    }
    if(!room.current_room) { return; }
    var message = {
      action: 'update',
      user_id: room.current_room.user_id
    }
    var audio = (room.local_tracks || []).find(function(t) { return t.type == 'audio'; });
    if(audio && !audio.enabled) {
      message.audio_muted = true;
    }
    message.tts = !!room.settings.tts;
    if((room.local_tracks || []).find(function(t) { return t.type == 'audio' && t.mediaStreamTrack && t.mediaStreamTrack.enabled && !t.mediaStreamTrack.muted; })) {
      message.audio = true;
    }
    if((room.local_tracks || []).find(function(t) { return t.type == 'video' && t.mediaStreamTrack && t.mediaStreamTrack.enabled && !t.mediaStreamTrack.muted; })) {
      message.video = true;
    }
    if(room.asserted_buttons) {
      room.asserted_buttons.buttons = room.asserted_buttons.buttons.map(function(b) { return room.simple_button(b)});
      message.asserted_buttons = room.asserted_buttons;
    }
    if(room.keyboard_state) {
      message.keyboard_state = room.keyboard_state;
    }
    if(room.current_room.room_initiator) {
      if(room.current_room.as_communicator) {
        message.communicator_id = room.current_room.user_id;
      } else {
        var earliest = {};
        for(var user_id in room.active_users) {
          if(room.active_users[user_id] && room.active_users[user_id] !== true) {
            var ts = room.active_users[user_id];
            if(!earliest['ts'] || earliest['ts'] > ts) {
              earliest = {user_id: user_id, ts: ts};
            }
          }
        }
        if(earliest.user_id) {
          message.communicator_id = earliest.user_id;
        }
      }
    }
    remote.send_message(room.current_room.id, message).then(null, function() {
      // prolly not a big deal
    });
    room.update_timeout = setTimeout(function() {
      room.send_update();
    }, 5000);
  },
  populate_reactions: function() {
    var container = document.getElementsByClassName('reactions')[0];
    if(container) {
      container.innerHTML = "";
      reactions.forEach(function(reaction) {
        var img = document.createElement("img");
        img.src = reaction.url;
        img.alt = reaction.text;
        container.appendChild(img);
      });  
    }  
  },
  populate_grids: function() {
    var container = document.querySelector('.grids');
    if(container) {
      container.innerHTML = "";
      var tally = 0;
      boards.grids.forEach(function(grid) {
        if(grid.skip || grid.disabled) { return; }
        tally++;
        if(tally > 8) { return; }
        var div = document.createElement('div');
        div.classList.add('grid_option');
        var name = document.createElement('span');
        name.innerText = grid.name;
        div.appendChild(name);
        var img = document.createElement('img');
        img.src = grid.image_url;
        img.alt = '';
        div.setAttribute('data-id', grid.id);
        div.appendChild(img)
        container.appendChild(div);
      });  
    }  
    var modal_list = document.querySelector('.modal_content #grids_modal .grid_options');
    if(modal_list) {
      var template = null;
      modal_list.querySelectorAll('.grid,.marker').forEach(function(grid) {
        if(!grid.classList.contains('template')) {
          grid.parentNode.removeChild(grid);
        } else {
          template = grid;
        }
      });
      var shown_count = 0;
      boards.grids.forEach(function(grid) {
        if(grid.skip) { return; }
        shown_count++;
        var elem = template.cloneNode(true);
        elem.style.display = 'block';
        elem.classList.remove('template');
        if(shown_count == 9) {
          var marker = document.createElement('div');
          marker.classList.add('marker');
          marker.innerText = "not shown in the main list";
          modal_list.appendChild(marker);
        }
        if(shown_count > 8) {
          elem.classList.add('extra');
        }
        elem.querySelector('.name').innerText = grid.name;
        elem.querySelector('img.image').src = grid.image_url;
        if(!grid.data_url) {
          elem.querySelector('button.delete').style.visibility = 'hidden';
        }
        elem.addEventListener('click', function(event) {
          event.preventDefault();
          event.stopPropagation();
          var content = document.querySelector('.modal .content') 
          var scroll = content.scrollTop;
          if(event.target.closest('.up')) {
            boards.shift(grid.data_url || grid.id, 'up');
          } else if(event.target.closest('.down')) {
            boards.shift(grid.data_url || grid.id, 'down');
          } else if(event.target.closest('.delete')) {
            boards.remove_url(grid.data_url);
          } else if(!event.target.closest('.links')) {
            room.assert_grid(grid.buttons, grid.data_url || grid.id, grid.locale);
            modal.close();
          }
          if(content && content.parentNode) {
            content.scrollTop = scroll;
          }
        });
        modal_list.appendChild(elem);
      });
    }
  },
  manage_grids: function() {
    modal.open('All Layouts', document.getElementById('grids_modal'));
    content = document.querySelector('.modal .content');
    content.querySelector('.add_layout').addEventListener('click', function(event) {
      var id = content.querySelector('#layout_url').value;
      var status = content.querySelector('.add_status');
      status.innerText = "Adding layout(s)...";
      boards.add_url(id, true).then(function() {
        content.querySelector('#layout_url').value = '';
        status.innerText = "";
      }, function(err) {
        if(err && err.responseJSON && err.responseJSON.unauthorized) {
          status.innerText = "Error adding layout, make sure linked board is public";
        } else {
          status.innerText = "Error adding layout";
        }
      });
    });
    content.querySelector('.reset').addEventListener('click', function(event) {
      if(content.querySelector('.reset .confirm').style.display == 'block') {
        boards.grids = (boards.original_grids || boards.grids);
        boards.persist();
        room.populate_grids();
        content.querySelector('.reset .confirm').style.display = 'none';
      } else {
        content.querySelector('.reset .confirm').style.display = 'block';
      }
    });
    content.querySelector('.share').addEventListener('click', function(event) {
      modal.open("Share Layouts as a Public Bundle", document.querySelector('#share_layouts_modal'), [
        {label: "Make This Bundle Public", action: 'share', callback: function() {
          var code = boards.export_grids().replace(/^grids:\/\//, '');
          session.ajax('/api/v1/bundles', {
            method: 'POST',
            data: {
              name: document.querySelector('.modal_content #bundle_name').value,
              author: document.querySelector('.modal_content #bundle_author_name').value,
              content: code,
              description: document.querySelector('.modal_content #bundle_description').value,
            }
          }).then(function(res) {
            window.open("/bundles/" + res.bundle.id, '_system');
            modal.close();
          }, function(err) {
            modal.note("Error creating bundle");
          });
        }}
      ]);
    }); 
    content.querySelector('.copy').addEventListener('click', function(event) {
      var uri = boards.export_grids();
      extras.copy(uri).then(function() {
        content.querySelector('.copy').innerText = "Layouts Copied!";
      }, function() {
        content.querySelector('.copy').innerText = "Layouts Copy Failed";
      });
    }); 
    room.populate_grids();
  },
  flush: function() {
    var now = (new Date()).getTime();
    for(var key in localStorage) {
      if(key.match(/^room_id_for/)) {
        try {
          var json = JSON.parse(localStorage[key]);
          if(json && (!json.exp || json.exp < now)) {
            localStorage.removeItem(key);
          }
        } catch(e) { localStorage.removeItem(key); }
      }
    }
  },
  load_settings: function() {
    try {
      room.settings = JSON.parse(localStorage['vidspeak_settings']);
    } catch(e) { room.settings = {}; }
    room.settings = room.settings || {};
    room.settings.symbol_library = room.settings.symbol_library || 'lessonpix';
    room.settings.tts = room.settings.tts || 'all';

    if(room.settings.audio_device_id == 'none' && room.settings.video_device_id == 'none') {
      room.settings['audio_device_id'] = 'any';
    }
    var opts = {audio: room.settings.audio_device_id != 'none', video: room.settings.video_device_id != 'none', data: true, audio_id: room.settings.audio_device_id, video_id: room.settings.video_device_id}
    room.input_settings = {data: true};
    if(opts.audio) { 
      room.input_settings.audio = {autoGainControl: true, echoCancellation: true, noiseSuppression: true}; 
      if(opts.audio_id) {
        room.input_settings.audio.deviceId = opts.audio_id;
      }
    }
    if(opts.video) { 
      room.input_settings.video = {facingMode: {ideal: 'user'}, height: 720}; 
      if(opts.video_id) {
        room.input_settings.video.deviceId = opts.device_id;
      }
    }

    room.flush();
  },
  start: function() {
    if(room.camera === false) {
      room.handle_camera_error();
    }
    // TODO: if the user hasn't accepted terms, pop them up
    var room_id = (location.pathname.match(/\/rooms\/([\w:]+)$/) || {})[1];
    if(!mirror_type && !teaching_type) {
      if(room_id && room_id.match(/^x/) && localStorage['room_id_for_' + room_id]) {
        try {
          var json = JSON.parse(localStorage['room_id_for_' + room_id]);
          room_id = json.id;
        } catch(e) { 
          // TODO: make this prettier
          alert('room data has been lost!');
          return;
        }
      } else if(room_id.match(/^x/)) {
        // TODO: make this prettier
        alert('room data has been lost!');
        return;
      } else {
        // obfuscate room id in case it shows up in a screen shot
        var local_id = "x" + btoa((new Date()).getTime() + "-" + Math.round(Math.random()));
        localStorage['room_id_for_' + local_id] = JSON.stringify({exp: (new Date()).getTime() + (48*60*60*1000), id: room_id});
        var new_path = location.pathname.replace(room_id, local_id);
        history.replaceState(null, '', new_path);
      }  
    }

    document.body.addEventListener('input', function(event) {
      if(event.target.tagName == 'INPUT') { 
        if(event.target.classList.contains('text_input')) {
          room.add_key({string: event.target.value});
        }
      }
    });
    document.body.addEventListener('keypress', function(event) {
      if(event.target.tagName == 'INPUT') { return; }
      // TODO: allow for the text_input element
      if(!document.querySelector('.preview #text')) { return; }
      if(event.key && event.keyCode != 13 && event.keyCode != 27 && event.keyCode != 8) {
        room.add_key(event.key);
      }
    });
    document.body.addEventListener('keydown', function(event) {
      if(event.ctrlKey || event.altKey || event.metaKey) { return; }
      if(event.target.tagName == 'INPUT' && !event.target.classList.contains('text_input')) { return; }
      // TODO: allow for the text_input element
      if(!document.querySelector('.preview #text')) { return; }
      if(event.keyCode == 13 || (event.keyCode == 9 && !event.target.classList.contains('text_input'))) {
        // TODO: newline/tab should be treated as concluding
        // the message, so let's keep it around for a little
        // bit and then clear it.
        room.add_key({confirm: true});
      } else if(event.keyCode == 8 && !event.target.classList.contains('text_input')) {
        room.add_key({backspace: true});
      } else if(event.keyCode == 27) {
        room.add_key({clear: true});
      }
    });
    
    room.room_id = room_id;
    room.load_settings();
    room.check_inputs();
    
    // TODO: show an intro video option (always for communicator, once for visitors)
    // TODO: if not over https and not on localhost, pre-empt error
    // TODO: show loading message
    room.populate_grids();
    boards.refresh();
    room.populate_reactions();
    room.size_video();
    var user_id = localStorage.user_id;
    if(!user_id) {
      user_id = (new Date()).getTime() + ":" + Math.round(Math.random() * 9999999);
    }
    var enter_room = function() {
      var room_check = new Promise(function(res, rej) {
        res({
          user_id: 'self',
          access: {},
          room: {
            key: 'mirror-room',
            type: mirror_type ? 'mirror' : 'video'
          }
        });
      });
      if(!mirror_type && !teaching_type) {
        room_check = session.ajax('/api/v1/rooms/' + room.room_id, {
          method: 'PUT',
          data: {user_id: user_id} 
        });
      }
      room_check.then(function(res) {
        room.current_user_id = res.user_id;
        remote.backend = res.room.type;
        var local_tried = false;
        remote.start_local_tracks(room.input_settings).then(function(tracks) {
          local_tried = true;
          for(var idx = 0; idx < tracks.length; idx++) {
            if(tracks[idx].type == 'video') {
              document.getElementById('communicator').innerHTML = "";
              document.getElementById('communicator').appendChild(tracks[idx].generate_dom());
            }
          }
          // Custom JavaScript as an option for rooms
          // NOTE: This is not sandboxed in any way, and
          // should only be allowed from highly-trusted sources
          if(res.room.js_url) {
            if(window.cleanupCustomRoom) {
              window.cleanupCustomRoom();
            }
            var script = document.querySelector('script#room_custom_js');
            if(script) {
              script.parentNode.removeChild(script);
            }
            script = document.createElement('script');
            script.id = 'room_custom_js';
            script.src = res.room.js_url;
            document.body.appendChild(script);
          }
          room.status("Connecting...");
          if(res.room.id != localStorage.room_id) {
            // Let the backend know we tried to negotiate a connection,
            // in case it fails
            session.ajax('/api/v1/rooms/' + res.room.id + '/coming', {
              method: 'GET',
              data: {status: 'connecting'}
            }).then(function(res) { }, function(err) { });
          }
          remote.connect_to_remote(res.access, res.room.key, function(status) {
            if(!room.active) {
              if(status.potential_partner_found) {
                room.status("Searching for Partner...", {invite: true});
              } else if(status.partner_negotiating) {
                room.status("Partner Connecting...");
              } else if(status.connection_failed) {
                room.status("Partner Failed to Connect");
              } else if(status.server_checking) {
                room.status("Finding a Streaming Server...");
              } else if(status.server_found) {
                room.status("Finalizing Connection..");
              } else if(status.training_first) {
                room.status("Partner Taking 10-minute Training...", {invite: true});
              } else if(status.waiting_room) {
                room.status("Partner in Waiting Room...", {invite: true});
                setTimeout(function() {
                  if(!room.active) {
                    room.status("Waiting for Partner...", {invite: true});
                  }
                }, 30000);
              }
            }
          }).then(function(room_session) {
            room_session.room_initiator = (room.room_id == localStorage.room_id);
            room.current_room = room_session;
            room.status('Waiting for Partner...', {invite: true});
            // TODO: if nothing happens for a while, try auto-reloading the page or something
            console.log("Successfully joined a Room: " + room_session.id + " as " + res.user_id);
            room_session.user_id = res.user_id;
            room_session.as_communicator = true;
            if(teaching_type) { room_session.as_communicator = false; }
            if(room_session.room_initiator && !mirror_type) {
              room_session.as_communicator = (localStorage.self_as_communicator == 'true');
              setTimeout(function() {
                if(!room.asserted_buttons) {
                  room.assert_grid(room.buttons, 'quick', room.board_locale || room.default_locale, true);
                }
              }, 3000);
            } 
            $(".grid").toggleClass('initiator', room_session.room_initiator)
            room.local_tracks = tracks;
            room.send_update();
            room.show_grid();
          }, function(error) {
            console.error("Unable to connect to Room: " + error.message);
          });
        }, function(err) {
          local_tried = true;
          console.error("Unable to create local tracks: ", err);
        });
        setTimeout(function() {
          if(!local_tried) {
            room.handle_camera_error({timeout: true});
          }
        }, 5000);
      }, function(err) {
        // TODO: alert the user, this will happen if the
        // communicator is no longer in the room
        console.error("Room creation error: ", err);
        room.status("Room failed to initialize, please try again");
      });
    };
    if(!mirror_type && !teaching_type && localStorage.user_id && room.room_id == localStorage.room_id) {
      // We check user auth here to make sure the user/room hasn't expired
      session.ajax('/api/v1/users', {
        method: 'POST',
        data: {
          user_id: localStorage.user_id,
          room_id: room.room_id,
          system: input.compat.system,
          browser: input.compat.browser,
          mobile: input.compat.mobile,
          pending_id: localStorage.pending_id
        }
      }).then(function(res) {
        enter_room();
      }, function(err) {
        console.error("User confirmation error: ", err);
      });
    } else {
      enter_room();
    }
  },
  hit_cell: function($cell) {
    if(room.current_room) {
      var button_id = $cell[0].button.id;
      var button = (room.buttons || []).find(function(b) { return b.id == button_id; });
      if(button && button.cell) {
        setTimeout(function() {
          room.speak_button(button)
        }, 50);
      }
      remote.send_message(room.current_room.id, {action: 'click', button: {id: $cell[0].button.id }}).then(null, function() {
        // click failed to deliver
      });
    }
    $cell.addClass('my_highlight');
    $cell.blur();
    var btn = $cell[0].button;
    if(btn.text == '+space') {
      room.add_key(' ');
    } else if(btn.text == '+backspace') {
      room.add_key({backspace: true});
    } else if(btn.text.match(/^\+/)) {
      room.add_key(btn.text.replace(/^\+/, ''));
    }
    setTimeout(function() {
      var btn = $cell[0].button;
      if(btn.load_id) {
        var load_id = btn.load_id;
        if(load_id == 'root') { load_id = room.root_id; }
        if(load_id && load_id.toString().match(/^http/)) {
          boards.find_url(load_id).then(function(grid) {
            room.assert_grid(grid.buttons, grid.id, grid.locale, false);
          }, function(err) {
            modal.note("Couldn't load linked layout", {error: true});
          })
        } else {
          var grid = boards.grids.find(function(g) { return g.id == load_id; });
          if(grid) {
            if(room.grid_id == load_id && room.grid_id == 'keyboard') {
              // 'clear' confirms the message before clearing
              room.add_key({confirm: true});
            } 
            room.assert_grid(grid.buttons, grid.id, false);
          }  
        }
      }
      $cell.removeClass('my_highlight');
    }, 1000);
  },
  speak_button: function(button) {
    var text = button.text;
    if(button.text.match(/^\+/)) {
      // TODO: set text to current text content
      text = null;
    }
    if(text) {      
      if(window.speechSynthesis && room.settings.tts && !button.load_id) {
        var voices = window.speechSynthesis.getVoices().filter(function(v) { return v.lang && v.lang.split(/-|_/)[0].toLowerCase() == (room.board_locale || 'en'); });
        var voice = voices.find(function(v) { return v.name.match(/^Google/)});
        voice = voice || voices[0];
        var u = new SpeechSynthesisUtterance(text);
        window.speechSynthesis.speak(u);
        return;
      }
      if(!room.current_room.as_communicator) {
        setTimeout(function() {
          input.play_sound('/sounds/ding.mp3');
        }, 500);
      }  
    }
  },
  check_inputs: function() {
    return input.enumerate('input').then(function(list) {
      room.audio_inputs = [];
      room.video_inputs = [];
      list.forEach(function(input) {
        if(input.type && room[input.type + '_inputs']) {
          room[input.type + '_inputs'].push(input);
        }
      });
      return list;
    });
  },
  handle_camera_error: function(err, callback) {
    var status = callback || room.status;

    if(err && err.timeout) {
      if(input.compat.webview) {
        status("Please grant camera access or load in your device's browser", {popout: true, big: true});
      } else {
        status("Please grant access to the camera");
      }
    } else if(err && err.name == 'NotAllowedError') {
      if(input.compat.webview) {
        status("Camera permission required", {popout: true});
      } else {
        status("Camera permission not granted, you may need to enable camera access for the browser through your device's settings");
      }
    } else if(err && err.name == 'NotFoundError') {
      if(input.compat.webview) {
        status("Camera access not available", {popout: true});
      } else {
        status("Can't accesss the camera, your device may not support video calling, or you have it disabled.", {big: true});
      }
    } else if(input.compat.webview) {
      status("Camera access doesn't work inside non-browser apps.", {popout: true, big: true});
    } else {
      status("Can't accesss the camera, your device may not support video calling, or you have it disabled.", {big: true});
    }
  },
  wire_track: function(elem, track) {
    track = track.mediaStreamTrack || track;
    if(elem.tagName == 'VIDEO') {
      room.last_preview_video_track = track;
    } else if(elem.tagName == 'AUDIO') {
      room.last_preview_audio_track = track;
      if(room.modal_analyser) { room.modal_analyser.release(); }
      elem.preview = true;
      elem.muted = true;
      room.modal_analyser = input.track_audio(elem, {mediaStreamTrack: track}, {});
      if(room.modal_analyser) {
        var level = document.querySelector('.modal .content #settings_audio_level');
        if(level) {
          room.modal_analyser.callback = function(output) {
            level.style.height = Math.min(95, output) + "%";
          }    
        }
      }
    }
    var stream = new MediaStream();
    stream.addTrack(track);
    elem.srcObject = stream;
    elem.onloadedmetadata = function(e) {
      elem.play();
    };
  },
  handle_input_switch: function(value, elem, callback) {
    if(value == 'none') {
      elem.srcObject = null;
      if(elem.tagName == 'AUDIO') {
        if(room.modal_analyser) { 
          room.modal_analyser.release(); 
          room.modal_analyser = null;
        }
        elem.src = '';
        var level = document.querySelector('.modal .content #settings_audio_level');
        if(level) {
          setTimeout(function() {
            level.style.height = '0px';
          }, 1000);    
        }
      }
      callback(null);
    } else {
      var opts = {};
      var type = elem.tagName.toLowerCase();
      opts[type] = {deviceId: value};
      var local = remote.local_track(type);
      // if(input.compat.mobile && local && local.mediaStreamTrack && local.mediaStreamTrack.getSettings().deviceId != value) {
      //   local.mediaStreamTrack.enabled = false;
      //   local.mediaStreamTrack.stop();
      // }
      setTimeout(function() {
        navigator.mediaDevices.getUserMedia(opts).then(function(stream) {
          stream.getTracks().forEach(function(track) {
            room.other_tracks = room.other_tracks || [];
            room.other_tracks.push(track);
          });
          var track = stream.getTracks()[0];
          if(track) {
            setTimeout(function() {
              room.wire_track(elem, track);
              setTimeout(function() {
                callback(track);
              }, input.compat.mobile ? 200 : 50);
            }, input.compat.mobile ? 200 : 50);
          }
        }, function(err) {
          // TODO: err...
        });  
      }, input.compat.mobile ? 200 : 50);
    }
  },
  update_from_settings: function() {
    // These are the user-streamed tracks, not any photos
    // or videos that are currently being streamed
    var video_track = remote.local_track('video'); 
    var audio_track = remote.local_track('audio');
    var current_video_id = video_track && video_track.device_id || 'none';
    var current_audio_id = audio_track && audio_track.device_id || 'none';
    var current_tracks = {audio: audio_track, video: video_track};
    var current_ids = {audio: current_audio_id, video: current_video_id};
    ['audio', 'video'].forEach(function(type) {
      var type_device_id = room['temp_' + type + '_device_id'] || room.settings[type + '_device_id']
      var last_preview_track = room['last_preview_' + type + '_track'];
      if(type_device_id != current_ids[type] || !current_tracks[type].enabled) {
        if(type_device_id == 'none') {
          if(current_tracks[type] && current_tracks[type].mediaStreamTrack) {
            current_tracks[type].mediaStreamTrack.enabled = false;
            // remote.remove_local_track(room.current_room.id, current_tracks[type]);
            // room.local_tracks = (room.local_tracks || []).filter(function(t) { return t.id != current_tracks[type].id; });
            room.update_preview();
          }
        } else if(last_preview_track && last_preview_track.getSettings().deviceId == type_device_id) {
          if(current_tracks[type] && current_tracks[type].mediaStreamTrack) {
            current_tracks[type].mediaStreamTrack.enabled = true;
          }
          remote.replace_local_track(room.current_room.id, last_preview_track).then(function(data) {
            var track = data.added;
            var old = data.removed;
            if(old) {
              room.local_tracks = (room.local_tracks || []).filter(function(t) { return t.id != old.id; });
            } else {
              var priority_ids = (room.priority_tracks || []).map(function(t) { return t.id; });
              room.local_tracks = (room.local_tracks || []).filter(function(t) { return t.type != track.type && (!t.mediaStreamTrack || priority_ids.indexOf(t.mediaStreamTrack.id) == -1); });
              console.error("had to resort to fallback for removing replaced " + type + " tracks");
            }
            // We add to the front of the list so shares don't get interrupted
            room.local_tracks.unshift(track);
            room.update_preview();
          }, function(err) {
            debugger
          });
        }
      }
    });
  },
  swap_video: function() {
    var video_track = remote.local_track('video');
    var current_video_id = room.temp_video_device_id || (video_track && video_track.device_id);
    room.check_inputs().then(function() {
      var list = (room.video_inputs || []);
      var ids = [];
      var group_ids = {};
      var facing_modes = {};
      if(current_video_id && current_video_id != 'none') { 
        var track = list.find(function(t) { return t.deviceId == current_video_id});
        if(track && !room.first_video) {
          room.first_video = {device_id: track.deviceId, group_id: track.groupId || track.deviceId, facing_mode: track.facingMode};
        }
      }
      // Limiting to one per groupId/facingMode for video swap
      // (you can still go to settings for the full list)
      if(room.first_video) {
        ids.push(room.first_video.device_id);
        group_ids[room.first_video.group_id] = true;
        if(room.first_video.facing_mode) {
          facing_modes[room.first_video.facing_mode] = true;
        }
      }
      list.forEach(function(d) {
        var facing = d.facingMode;
        var group_id = d.groupId || d.deviceId;
        if(!group_ids[group_id] && (!facing || !facing_modes[facing])) {
          ids.push(d.deviceId);
          group_ids[group_id] = true;
          facing_modes[facing] = true;
        }
      });
      room.video_device_ids = ids;
      var idx = room.video_device_ids.indexOf(current_video_id);
      var new_idx = idx + 1;
      room.temp_video_device_id = room.video_device_ids[new_idx] || 'none';
      // room.temp_video_device_id = null;
      // room.settings.video_device_id = room.video_device_ids[new_idx] || 'none';
      // localStorage['vidspeak_settings'] = JSON.stringify(room.settings);
  
      var video = document.querySelector('#swap_video') || document.createElement('video');
      video.id = 'swap_video';
      video.style.position = 'absolute';
      video.style.left = '-1000px';
      document.body.appendChild(video);
      // For some reason I haven't tracked down yet, if the
      // input switch happens to soon, then it messed up
      // the next MediaStreamTrack in a way that breaks it
      // from ever streaing again unless you reload the page
      setTimeout(function() {
        room.handle_input_switch(room.temp_video_device_id || room.settings.video_device_id, video, function(track) {
          setTimeout(function() {
            room.update_from_settings();
          }, 500);
        });
      }, input.compat.mobile ? 200 : 50);
    });
    document.querySelector('#communicator').classList.add('pending');
    setTimeout(function() {
      document.querySelector('#communicator').classList.remove('pending');
    }, 2000);  
  },
  filled_grid: function(lookups, transpose) {
    if(lookups.length == 6) {
      lookups = [
        room.buttons[0], 
        room.buttons[1], 
        room.buttons[2], 
        room.buttons[3], 
        room.buttons[5], 
        null, 
        room.buttons[4],
        null
      ];
    } else if(lookups.length == 4) {
      lookups = [
        null, 
        room.buttons[1], 
        null, 
        room.buttons[0], 
        room.buttons[2], 
        null, 
        room.buttons[3],
        null
      ];
    }
    if(transpose) {
      lookups = [
        lookups[0],
        lookups[3],
        lookups[5],
        lookups[1],
        lookups[6],
        lookups[2],
        lookups[4],
        lookups[7]
      ];
    }
    return lookups;
  },
  show_grid: function() {
    if(!room.buttons) { return; }
    var for_communicator = room.current_room && room.current_room.as_communicator;
    var window_height = window.innerHeight;
    var video_height = window_height - ((window_height / 3) - 7) - (window_height * .12) - 21;
    // document.getElementById('partner').parentNode.style.height = video_height + "px";
    var fill_cell = function(cell, button) {
      if(!button) {
        cell.style.display = 'none';
        return;
      }
      var text = cell.getElementsByClassName('text')[0];
      var button_text = button.text;
      if(button.text == '+space') {
        button_text = '⎵';
        cell.classList.add('big_text');
      } else if(button.text == '+backspace') {
        button_text = '⌫';
        cell.classList.add('big_text');
      } else if(button.text.match(/^\+/)) {
        button_text = button.text.replace(/^\+/, '');
        cell.classList.add('big_text');
      } else {
        cell.classList.remove('big_text');
      }
      text.innerText = button_text;
      cell.style.display = '';
      cell.style.visibility = 'visible';
//      cell.style.height = ((window_height / 3) - 7) + "px";
      if(cell.classList.contains('skinny')) {
        // cell.style.height = (window_height * .12) + "px";
      }
      if(button.load_id && !button.text.match(/^\+/) && (button.load_id != 'root' || room.root_id)) {
        if(button.load_id != 'root' || room.root_id) {
          if(button.load_id == 'root' && room.root_id == room.grid_id) {
            // don't show as link if already on main page
            cell.classList.remove('link');
          } else {
            cell.classList.add('link');
          }
        }
      } else {
        cell.classList.remove('link');
      }
      cell.classList.remove('my_highlight');
      cell.classList.remove('highlight');
      cell.classList.remove('image_only');
      cell.parentNode.style.height = window_height + "px";
      // cell.parentNode.style.display = 'block';
      var img = cell.getElementsByTagName('img')[0];
      if(img) {
        var image_url = button.image_url;
        if(symbols['en'] && symbols['en'][button.text.toLowerCase()] && symbols['en'][button.text.toLowerCase()][room.settings.symbol_library]) {
          image_url = symbols['en'][button.text.toLowerCase()][room.settings.symbol_library];
        }
    
        if(image_url && room.settings.symbol_library != 'none') {
          img.style.visibility = 'visible';
          img.src = "/blank.gif";
          setTimeout(function() {
            img.src = image_url;
          }, 10);
          cell.classList.remove('text_only');
          if(button.image_only) {
            cell.classList.add('image_only');
          }
        } else {
          img.style.visibility = 'hidden';
          cell.classList.add('text_only');
        }
      }
      cell.button = button;
      button.cell = cell;
    };
    var lookups = room.filled_grid(room.buttons);
    if(for_communicator) {
      // Default Order
      var grid = document.getElementsByClassName('grid')[0];
      var cells = grid.getElementsByClassName('cell');
      for(var idx = 0; idx < cells.length; idx++) {
        var num = parseInt(cells[idx].getAttribute('data-idx'), 10);
        fill_cell(cells[idx], lookups[num]);
      }
    } else {
      // Reverse Order
      var grid = document.getElementsByClassName('grid')[0];
      var cells = grid.getElementsByClassName('cell');
      var new_order = [].concat(lookups);
      new_order[0] = lookups[2];
      new_order[2] = lookups[0];
      new_order[3] = lookups[4];
      new_order[4] = lookups[3];
      new_order[5] = lookups[7];
      new_order[7] = lookups[5];
      for(var idx = 0; idx < cells.length; idx++) {
        var num = parseInt(cells[idx].getAttribute('data-idx'), 10);
        fill_cell(cells[idx], new_order[num]);
      }
    }
  },
  show_keyboard: function() {
    var edit = document.querySelector('.preview .text_input');
    var show = document.querySelector('.preview .text_display');
    var prompt = document.querySelector('.preview .prompt');

    prompt.style.display = 'block';
    // TODO: enable edit icon/button
    var str = room.keyboard_state && room.keyboard_state.string;
    var lingering = false;
    if(room.keyboard_state.linger && room.keyboard_state.linger.string_id != room.local_linger_id) {
      var now = (new Date()).getTime();
      if(room.keyboard_state.linger.string_at && room.keyboard_state.linger.string_at > (now - 30000)) {
        str = room.keyboard_state.linger.string;
        lingering = true;
      }
    }
    if(str) {
      edit.tmp_id = null;
      if(edit.style.display != 'block' && show.style.display != 'block') {
        show.style.display = 'block';
      }
      edit.style.opacity = 1.0;
      edit.value = str;
      show.style.opacity = 1.0;
      show.innerText = str;
      room.editing = true;
      document.querySelector('#text_prompt').classList.add('active');
      if(lingering) {
        edit.classList.add('lingering');
        show.classList.add('lingering');
        room.speak_button({text: str});
      } else {
        edit.classList.remove('lingering');
        show.classList.remove('lingering');
      }
      if(!edit.focus_watch) {
        edit.focus_watch = true;
        edit.addEventListener('focus', function(event) {
        });
        edit.addEventListener('blur', function(event) {
          if(!edit.auto_blur) {
            edit.style.display = 'none';
            show.style.display = 'block';  
          }
          edit.auto_blur = false;
        });
      }
      // TODO: measure text and resize accordingly
    } else {
      var tmp_id = Math.round(Math.random() * 99999);
      edit.tmp_id = tmp_id;
      if(document.activeElement != edit) {
        edit.auto_blur = true;
        edit.blur();
        edit.style.opacity = 0.0;
      }
      setTimeout(function() {
        if(edit.tmp_id == tmp_id) {
          edit.value = "";
          show.innerText = "";
          edit.tmp_id = null;
          edit.style.display = 'none';
          show.style.display = 'none';
        }
      }, 2000);
    }
  },
  toggle_input: function(force) {
    var edit = document.querySelector('.preview .text_input');
    var show = document.querySelector('.preview .text_display');
    if(room.editing && !force) {
      room.add_key({clear: true});
    } else {
      edit.tmp_id = null;
      edit.style.display = 'block';
      edit.style.opacity = 1.0;
      edit.focus();
      edit.selectionStart = edit.selectionEnd = 100000;
      show.style.display = 'none';
    }
  },
  add_key: function(str) {
    var now = (new Date()).getTime();
    room.keyboard_state = room.keyboard_state || {string: ""};
    if(str.backspace) {
      var ref = room.keyboard_state.string || "";
      room.keyboard_state.string = ref.substring(0, ref.length - 1);
      if(room.keyboard_state.string == '') {
        str = {clear: true};
      }
    }
    if(str.backspace) {
    } else if(str.clear) {
      room.keyboard_state.string = "";
      room.editing = false;
      document.querySelector('.preview .text_input').blur();
      document.querySelector('.preview .text_input').value = '';
      document.querySelector('.preview .text_display').innerText = '';
    } else if(str.confirm) {
      if(room.keyboard_state.string) {
        room.keyboard_state.linger = {}
        room.speak_button({text: room.keyboard_state.string});
        room.keyboard_state.linger.string = room.keyboard_state.string;
        var linger_id = Math.round(Math.random() * 99999);
        room.keyboard_state.linger.string_at = now;
        room.keyboard_state.linger.string_id = linger_id;
        room.local_linger_id = linger_id;
        setTimeout(function() {
          if(room.keyboard_state && room.keyboard_state.linger && room.keyboard_state.linger.string_id == linger_id) {
            delete room.keyboard_state.linger;
            room.keyboard_state.set_at = (new Date()).getTime();
            room.show_keyboard();
            room.send_update();        
          }
        }, 5000);
      }
      room.keyboard_state.string = "";
      room.editing = false;
      document.querySelector('#text_prompt').classList.remove('active');
      document.querySelector('.preview .text_input').blur();
      document.querySelector('.preview .text_input').value = '';
      document.querySelector('.preview .text_display').innerText = '';
    } else if(str.string != null) {
      room.keyboard_state.string = str.string;
    } else {
      room.keyboard_state.string = room.keyboard_state.string + str;
    }
    if(!room.keyboard_state.string) {
      room.keyboard_state.string = "";
      document.querySelector('#text_prompt').classList.remove('active');
    }
    room.keyboard_state.set_at = now;
    room.show_keyboard();
    room.send_update();
  },
  show_image: function(url, text, big_image) {
    var total_slots = 3;
    room.image_slots = room.image_slots || [];
    room.image_slots.index = room.image_slots.index || 0;
    var reactions_popover = document.querySelector('.popover .reactions');
    var popover_in_the_way = reactions_popover && reactions_popover.offsetWidth > 0;
    var found_empty = false;
    for(var idx = 0; idx < total_slots; idx++) {
      if(!room.image_slots[idx] && !found_empty) {
        found_empty = true;
        room.image_slots.index = idx;
      }
    }
    var idx = room.image_slots.index;
    var img = document.createElement('img');
    img.classList.add('reaction');
    var orig_left = ((idx * 60) + 10);
    img.style.left = orig_left + 'px';
    if(big_image && popover_in_the_way) {
      var elem = document.querySelector('.preview');
      var rect = elem.getBoundingClientRect();
      img.style.left = (rect.width - 100 - (total_slots * 60) + orig_left) + 'px';
    }
    img.src = url;
    img.alt = text;
    var wait = 10;
    if(room.image_slots[idx]) {
      var prior = room.image_slots[idx];
      prior.style.opacity = 0;
      setTimeout(function() {
        prior.parentNode.removeChild(prior);
      }, 1000);
      wait = 510;
    }
    room.image_slots[idx] = img;
    room.image_slots.index = (idx + 1) % total_slots;
    setTimeout(function() {
      var complete = function() {
        if(room.image_slots[idx] == img) {
          room.image_slots[idx] = null;
        }
        img.style.opacity = 0;
        setTimeout(function() {
          if(img.parentNode) {
            img.parentNode.removeChild(img);
          }
        }, 500);
      };
      document.getElementsByClassName('preview')[0].appendChild(img);
      if(!big_image) {
        img.classList.add('finished');
        setTimeout(complete, 10000);
      } else {
        if(popover_in_the_way) {

        }
        setTimeout(function() {
          img.style.left = orig_left + 'px';
          img.classList.add('finished');
          setTimeout(complete, 20000);
        }, 3000);
      }
      setTimeout(function() {
        img.style.opacity = 1;
      }, 100);
    }, wait);
  },
  invite: function() {
    var url = location.origin + "/rooms/" + room.room_id + "/join";
    document.querySelector('#invite_modal .link').innerText = url;
    var actions = [
      {action: 'copy', label: "Copy Link", callback: function() {
        // Select the link anchor text  
        extras.copy(url).then(function(res) {
          if(res.copied) {
            document.querySelector('.modal .modal_footer .modal_button').innerText = 'Copied!';
            setTimeout(function() {
              modal.close();
            }, 2000);
          }
        }, function() {

        });
      }}
    ];
    if(navigator.canShare && navigator.canShare()) {
      actions.push({action: 'share', label: "Share", callback: function() {
        if(navigator.share) {
          navigator.share({url: url});
        }
        modal.close();
      }})
    }
    modal.open("Invite a Visitor", document.getElementById('invite_modal'), actions);
    if(window.QRCode) {
      var qr = new window.QRCode(document.querySelector('.modal #invite_modal .qr_code'), url);
      document.querySelector('.modal #invite_modal .qr_code').setAttribute('title', '');
      document.querySelector('.modal #invite_modal .shown_link').innerText = url;
    }
  },
  toggle_controls: function(force) {
    var $nav = $("#nav");
    var $text_prompt = $("#text_prompt");
    if(force == null) {
      force = $nav.css('opacity') == '1' ? false : true;
    }
    var now = (new Date()).getTime();
    if(!force && $nav[0].shown_at && $nav[0].shown_at > now - 500) {
      return;
    }
    $nav.css('opacity', force ? 1 : 0);
    $text_prompt.css('opacity', force ? 1 : 0);
    if(room.current_room && !room.current_room.as_communicator) {
      document.querySelector('#eyes').style.opacity = force ? 1 : 0;
    }
    $nav[0].shown_at = now;
    $nav[0].hide_at = now + 5000;
    if(!room.nav_interval) {
      room.nav_interval = setInterval(function() {
        var now = (new Date()).getTime();
        var hide_at = ($("#nav")[0] || {}).hide_at;
        if(hide_at && hide_at < now) {
          $("#nav").css('opacity', 0);
          $("#text_prompt").css('opacity', 0);
          document.querySelector('#eyes').style.opacity = 0;
          $("#nav")[0].hide_at = null;
        }
      }, 500);
    }
  },
  handle_message: function(data) {
    var json = data.message;
    if(!room.current_room || data.user_id == room.current_room.user_id) { return; }
    if(json && json.action == 'click') {
      var button = (room.buttons || []).find(function(b) { return b.id == json.button.id; });
      if(button && button.cell) {
        if(!mirror_type && !teaching_type) {
          room.speak_button(button);
        }

        button.cell.classList.add('highlight');
        setTimeout(function() {
          button.cell.classList.remove('highlight');
        }, 5000);
      }
      room.buttons.forEach(function(button) {
  
      });
    } else if(json && json.action == 'image') {
      var big_image = false;
      if(data.message.from_communicator && !room.current_room.as_communicator) {
        // if sent by the communicator, who is not you
        // show a big version of the image
        big_image = true;
      } else if(!data.message.from_communicator && room.current_room.as_communicator) {
        // or if sent by someone else and you are the communicator
        // show a big version of the image
        big_image = true;
      } else if(mirror_type) {
        big_image = true;
      } else {
        // show a small version of the image
      }
      room.show_image(json.url, json.text, big_image);
    } else if(json && json.action == 'update') {
      if(data.user) {
        if(data.message.video) {
          document.querySelector('#no_preview').style.display = 'none';
          document.querySelector('#eyes').style.display = 'block';
          // TODO: show the video feed (and audio indicator?)
          // If no video feed present, send a request for it
          if(!room.all_remote_tracks.find(function(t) { return t.type == 'video' && t.user_id == data.user.id && !(t.mediaStreamTrack || {}).muted; })) {
            // remote.reconnect();
            remote.refresh_remote_tracks(room.current_room.id, 'video');
          // } else {
          //   debugger
          //   remote.reconnect();
          }
        } else if(data.message.audio) {
          document.querySelector('#no_preview').style.display = 'block';
          document.querySelector('#eyes').style.display = 'none';
          document.querySelector('#no_preview').classList.remove('dancing');
          // TODO: show the unanimated preview w/ animated audio
          // If no audio feed present, send a request for it
          if(!room.all_remote_tracks.find(function(t) { return t.type == 'audio' && t.user_id == data.user.id && !(t.mediaStreamTrack || {}).muted; })) {
            // remote.reconnect();
            remote.refresh_remote_tracks(room.current_room.id, 'audio');
          // } else {
          //   debugger
          //   remote.reconnect();
          }
        } else {
          document.querySelector('#no_preview').classList.add('dancing');
          document.querySelector('#no_preview').style.display = 'block';
          document.querySelector('#eyes').style.display = 'none';
          // show the animated preview
        }
        if(data.message.communicator_id) {
          // clean up users that haven't checked in for a while
          var cutoff = (new Date()).getTime() - 60000;
          for(var user_id in room.active_users) {
            if(room.active_users[user_id] !== true && room.active_users[user_id] < cutoff) {
              room.active_users[user_id] = true;
            }
          }
          // check if you were just promoted to communicator
          if(!mirror_type && !teaching_type) {
            var prior = room.current_room.as_communicator;
            room.current_room.as_communicator = (data.message.communicator_id == room.current_room.user_id);
            if(prior != room.current_room.as_communicator) {
              room.show_grid();
            }  
          }
        }
      }
      if(data.user && data.user.ts_offset != null && json.asserted_buttons) {
        // accept the other user's butttons if they were updated
        // more recently than your own
        var ts = json.asserted_buttons.set_at - data.user.ts_offset;
        if(room.buttons && (!room.buttons.set_at || room.buttons.set_at < ts)) {
          var changed = json.asserted_buttons.symbol_library != room.settings.symbol_library;
          room.buttons.forEach(function(btn, idx) {
            if(!room.simple_button(btn, json.asserted_buttons.buttons[idx]).same) {
              changed = true;
            }
          });
          if(changed) {
            room.asserted_buttons = json.asserted_buttons;
            room.asserted_buttons.set_at = ts - 1000;
            room.settings.symbol_library = json.asserted_buttons.symbol_library;
            localStorage['vidspeak_settings'] = JSON.stringify(room.settings);
            room.buttons = json.asserted_buttons.buttons;
            room.board_locale = json.asserted_buttons.locale || room.board_locale || room.default_locale;
            room.buttons.set_at = ts - 1000;
            room.grid_id = json.asserted_buttons.grid_id;
            room.root_id = json.asserted_buttons.root_id;
            room.show_grid();
          }
        }
      }
      if(data.user && data.user.ts_offset != null && json.keyboard_state) {
        // accept the other user's butttons if they were updated
        // more recently than your own
        // console.log("KEYBOARD STATE", json.keyboard_state);
        var ts = json.keyboard_state.set_at - data.user.ts_offset;
        var now = (new Date()).getTime();
        var current_state = room.keyboard_state || {};
        if(!current_state.set_at || current_state.set_at < ts) {
          var changed = json.keyboard_state.string != current_state.string;
          if(json.keyboard_state.linger && json.keyboard_state.linger.string_at < (now - 3000)) {
            changed = true;
          } else if(room.keyboard_state && room.keyboard_state.linger && !json.keyboard_state.linger) {
            changed = true;
          }
          if(changed) {
            room.keyboard_state = json.keyboard_state;
            room.keyboard_state.set_at = ts - 1000;
            if(room.keyboard_state.linger && room.keyboard_state.linger.string_at < (now - 3000)) {
              delete room.keyboard_state.linger;
            }
            room.show_keyboard();
          }
        }
      }
    } else if(json.action && json.action == 'goodbye') {
      if(data.user) {
        room.user_left(data.user);
        // TODO: pro-actively remove tracks and dom elements for user
      }
      
    } else {
      // TODO: if more users in the feed, ensure
      // that everyone else sees the communicator's video feed
      console.log("MESSAGE:", json);
    }  
  },
  user_left: function(user) {
    if(user && (room.active_users || {})[user.id]) {
      delete room.active_users[user.id];
      input.play_sound('/sounds/exit.mp3');
      var elems = document.getElementById('partner').querySelectorAll('audio,video');
      var to_remove = [];
      for(var idx = 0; idx < elems.length; idx++) {
        if(elems[idx].getAttribute('data-user-id') == user.id) {
          to_remove.push(elems[idx]);
        }
      }
      setTimeout(function() {
        if(!(room.active_users || {})[user.id]) {
          to_remove.forEach(function(e) {
            if(e.parentNode) {
              e.parentNode.removeChild(e);
            }
          });    
        }
      }, 2000);
    }
  },
  cleanup: function() {
    // turbolinks...
    (room.other_tracks || []).forEach(function(track) {
      track.enabled = false;
      track.stop();
    });
    room.other_tracks = null;
    (room.local_tracks || []).forEach(function(track_ref) {
      if(track_ref.mediaStreamTrack) {
        track_ref.mediaStreamTrack.enabled = false;
        track_ref.mediaStreamTrack.stop();
      }
    });
    room.local_tracks = null;
  },
  simple_button: function(btn, comp) {
    if(!btn) { return {}; }
    var res = {
      id: btn.id,
      text: btn.text,
      load_id: btn.load_id,
      image_url: btn.image_url,
      image_only: btn.image_only
    };
    if(symbols['en'] && symbols['en'][btn.text.toLowerCase()] && symbols['en'][btn.text.toLowerCase()][room.settings.symbol_library]) {
      res.image_url = symbols['en'][btn.text.toLowerCase()][room.settings.symbol_library];
    }
    if(comp) {
      res.same = comp.id == btn.id && comp.text == btn.text && comp.image_url == btn.image_url && comp.load_id == btn.load_id;
    }
    return res;
  },
  start_and_enter_room: function(res) {
    localStorage.removeItem('teach_return_url');
    localStorage.user_id = res.user.id;
    localStorage.room_id = res.user.room_id;
    localStorage.room_set_at = (new Date()).getTime();
    localStorage.self_as_communicator = (!!res.user.as_communicator).toString();
    localStorage.show_images = 'true';
    localStorage.terms_accepted = 'true';
    location.href = '/rooms/' + res.user.room_id;
  }
};
window.addEventListener('resize', function() {
  room.size_video();
  room.show_grid();
});
var shift = function(event) {
  room.manual_zoom = true;
  if(event.touches) {
    event.clientX = event.touches[0].clientX;
    event.clientY = event.touches[0].clientY;
  }
  room.shift_x = event.clientX - (room.drag_x || event.clientX);
  room.shift_y = event.clientY - (room.drag_y || event.clientY);
  room.size_video();
  room.toggle_controls(true);
  // console.log("drag", room.shift_x, room.shift_y);
}
var drag = function(event) {
  if(event.touches) {
    event.clientX = event.touches[0].clientX;
    event.clientY = event.touches[0].clientY;
  }
  room.drag_x = event.clientX - (room.shift_x || 0);
  room.drag_y = event.clientY - (room.shift_y || 0);
};
document.addEventListener('mousemove', function(event) {
  if($(event.target).closest('.grid').length == 0) { return; }
  if(event.target.classList.contains('text_input')) { return; }
  if($(event.target).closest('#partner').length > 0 && event.buttons == 1) {
    event.preventDefault();
    shift(event);
  } else if(event.target.closest('#partner,#nav,#eyes,#no_preview,#status_holder') && !event.target.closest('a,button')) {
    // if moving the mouse more than 1.5s, show controls
    if(!room.partner_hover) {
      clearTimeout(room.partner_hover);
      room.partner_hover = setTimeout(function() {
        if(room.partner_hover) {
          room.toggle_controls(true);
        }
      }, 1500);
    }
    // if moved and rested on partner, show controls
    if(room.partner_linger) {
      clearTimeout(room.partner_linger);
    }
    room.partner_linger = setTimeout(function() {
      if(room.partner_linger) {
        room.toggle_controls(true);
      }
    }, 500);
  } else {
    if(room.partner_hover) {
      clearTimeout(room.partner_hover);
      room.partner_hover = false;
    }
    if(room.partner_linger) {
      clearTimeout(room.partner_linger);
      room.partner_linger = false;
    }
  }
});
document.addEventListener('touchmove', function(event) {
  if($(event.target).closest('.grid').length == 0) { return; }
  if(event.target.classList.contains('text_input')) { return; }
  if($(event.target).closest('#partner').length > 0) {
    event.preventDefault();
    shift(event);
  }
});
document.addEventListener('mousedown', function(event) {
  if($(event.target).closest('.grid').length == 0) { return; }
  if(event.target.classList.contains('text_input')) { return; }
  if(document.activeElement && document.activeElement.classList.contains('text_input')) { document.activeElement.blur(); return; }
  if($(".popover:visible").length > 0) {
    if($(event.target).closest('.button:not(.sub_button)').find(".popover:visible").length == 0) {
      $(".popover:visible").css('display', 'none');
    }
  }
  if($(event.target).closest('#partner').length > 0) {
    event.preventDefault();
    drag(event);
  } else if(true) {
    event.preventDefault();
  }
});
document.addEventListener('touchstart', function(event) {
  if($(event.target).closest('.grid').length == 0) { return; }
  if(event.target.classList.contains('text_input')) { return; }
  if(document.activeElement && document.activeElement.classList.contains('text_input')) { document.activeElement.blur(); return; }
  if($(".popover:visible").length > 0) {
    if($(event.target).closest('.button:not(.sub_button)').find(".popover:visible").length == 0) {
      $(".popover:visible").css('display', 'none');
    }
  }
  if($(event.target).closest('#partner').length > 0) {
    event.preventDefault();
    drag(event);
  } else if(true) {
    event.preventDefault();
  }
});
document.addEventListener('click', function(event) {
  if(!event.target.closest('#video_controls')) {
    if($(event.target).closest('.grid').length == 0) { return; }
  }
  if(event.target.classList.contains('text_input')) { return; }  
  var $cell = $(event.target).closest('.cell');
  if($cell.closest('.preview').length > 0) { $cell = []; }
  var $button = $(event.target).closest('.button');
  var $partner = $(event.target).closest('#partner,#eyes,#no_preview,#status_holder');
  var $invite = $(event.target).closest('#invite_partner');
  var $continue = $(event.target).closest('#continue_teaching');
  var $popout = $(event.target).closest('#popout_view');
  var $popout = $(event.target).closest('#popout_view');
  var personalize = event.target.closest('.personalize');
  var teach_action = event.target.closest('.teach_video_action');
  var $text_prompt = $(event.target).closest('#text_prompt');
  var $text_display = $(event.target).closest('.text_display');
  var $communicator = $(event.target).closest('#communicator');
  var $zoom = $(event.target).closest('.zoom');
  if($(event.target).closest("#nav").css('opacity') == '0') {
    $partner = $("#partner");
    $zoom.blur();
  }
  if($communicator.length > 0) {
    if(event.target.closest('.end_share') != null) {
      room.end_share();
    } else {
      room.toggle_video();
    }
  } else if($partner.length > 0 && !event.target.closest('a,button')) {
    if(room.partner_hover) {
      clearTimeout(room.partner_hover);
      room.partner_hover = false;
    }
    if(room.partner_linger) {
      clearTimeout(room.partner_linger);
      room.partner_linger = false;
    }
    room.toggle_controls();
  } else if($invite.length > 0) {
    room.invite();
  } else if(personalize) {
    room.manage_grids();
    event.preventDefault();
    event.target.closest('.popover').style.display = 'none';
  } else if($continue.length > 0) {
    if(room.video_continue) {
      room.video_continue();
    } else {
      console.error("Expected room.video_continue, but missing");
    }
  } else if(teach_action && remote.video && remote.video.jump) {
    if(teach_action.classList.contains('back')) {
      remote.video.jump('back');
    } else if(teach_action.classList.contains('forward')) {
      remote.video.jump('forward');
    } else if(teach_action.classList.contains('play')) {
      remote.video.jump('play');
    } else if(teach_action.classList.contains('pause')) {
      remote.video.jump('pause');
    }
  } else if($popout.length > 0) {
    var url = location.origin + "/rooms/" + room.room_id + "/join";
    window.open(url, '_system');
  } else if($text_prompt.length > 0) {
    event.preventDefault();
    room.toggle_input();
  } else if($text_display.length > 0) {
    event.preventDefault();
    room.toggle_input(true);
  } else if($cell.length > 0) {
    event.preventDefault();
    room.hit_cell($cell);
  } else if($button.length > 0) {
    event.preventDefault();
    if($button.hasClass('with_popover')) {
      if($button.find(".popover").css('display') != 'block') {
        $button.find(".popover").css('display', 'block');
        return;
      } else if($(event.target).closest(".popover").length == 0) {
        $button.find(".popover").css('display', 'none');
        return;
      }
    }
    var do_hide = true;
    var action = $button.attr('data-action');
    if(action == 'end') {
      var leave_label = "Leave Room";
      var header_label = "Return to the Video Call?";
      if(localStorage.teach_return_url && teaching_type) {
        leave_label = "Back to the Previous Room";
        header_label = "Return to the Video Call?";
      }
      modal.open(header_label, document.getElementById('confirm_exit'), [
        {label: leave_label, action: "leave", callback: function() {
          modal.close();
          if(room.current_room) {
            remote.send_message(room.current_room.id, {action: 'goodbye'}).then(null, function() { });
          }
          setTimeout(function() {
            location.href = localStorage.teach_return_url || "/thanks";
          }, 300);
        }},
        {label: "Cancel", action: "close"}
      ]);
    } else if(action == 'customize') {
      var size = (room.buttons || {}).length || 8;
      var content = null;
      modal.open('Customize Buttons', document.getElementById('customize_modal'), [
        {action: 'accept', label: "Update Buttons", callback: function() {
          var image_urls = {};
          document.querySelectorAll('.grid .cell').forEach(function(cell) {
            var img = cell.querySelector('img');
            if(img && img.style.visibility == 'visible' && img.src) {
              image_urls[cell.querySelector('.text').innerText] = img.src;
            }
          });

          var ref = {};
          content.querySelectorAll('.layout_button').forEach(function(btn) {
            var input = btn.querySelector('input');
            if(input && input.name) {
              ref[input.name] = input.value;
            }
          });
          var grid = [];
          if(size == 8) {
            grid = [
              {id: 1, text: ref['l1']},
              {id: 2, text: ref['m1']},
              {id: 3, text: ref['r1']},
              {id: 4, text: ref['l2']},
              {id: 5, text: ref['r2']},
              {id: 6, text: ref['l3']},
              {id: 7, text: ref['m2']},
              {id: 8, text: ref['r3']}
            ];
          } else if(size == 6) {
            grid = [
              {id: 1, text: ref['l1']},
              {id: 2, text: ref['m1']},
              {id: 3, text: ref['r1']},
              {id: 4, text: ref['l2']},
              {id: 5, text: ref['m2']},
              {id: 6, text: ref['r2']}
            ];
          } else if(size == 4) {
            grid = [
              {id: 1, text: ref['l2']},
              {id: 2, text: ref['m1']},
              {id: 3, text: ref['r2']},
              {id: 4, text: ref['m2']}
            ];
          }
          grid.forEach(function(i) {
            if(image_urls[i.text]) {
              i.image_url = image_urls[i.text];
            }
          });
          var locale = navigator.language.split(/-|_/)[0].toLowerCase();
          room.assert_grid(grid, 'custom_' + (new Date()).getTime + "_" + Math.random(), locale, true);
          modal.close();
        }},
        {action: 'load', label: "Import Board", callback: function() {
          room.manage_grids();
        }},
      ]);
      content = document.querySelector('.modal .content');
      if(!room.current_room.as_communicator) {
        content.querySelector('.reverse').style.display = 'inline';
      }
      content.addEventListener('click', function(event) {
        if(event.target.classList.contains('personalize')) {
          event.preventDefault();
          room.manage_grids();
        } else if(event.target.classList.contains('size')) {
          size = parseInt(event.target.getAttribute('data-size'), 10);
          content.querySelectorAll('button.size').forEach(function(btn) {
            if(btn == event.target) {
              btn.classList.add('primary');
            } else {
              btn.classList.remove('primary');
            }
          });
          content.querySelectorAll('.layout_button').forEach(function(btn) {
            var input = btn.querySelector('input');
            if(input) {
              btn.style.display = 'none';
              if(['l2', 'm1', 'm2', 'r2'].indexOf(input.name) != -1) {
                btn.style.display = 'flex';
              } else if(size > 4 && ['l1', 'r1'].indexOf(input.name) != -1) {
                btn.style.display = 'flex';
              } else if(size > 6 && ['l3', 'r3'].indexOf(input.name) != -1) {
                btn.style.display = 'flex';  
              }  
            }
          });
        }
      });
      content.querySelector("button.size[data-size='" + size + "']").click();
      var buttons = content.querySelectorAll('.layout .layout_button:not(.preview)');

      var lookups = room.filled_grid(room.buttons, true);
      buttons.forEach(function(btn, idx) {
        var input = btn.querySelector('input');
        if(input && lookups[idx]) {
          var text = lookups[idx].text;
          input.value = text;
        }
      });
    } else if(action == 'info') {
      modal.open("About Co-VidSpeak", document.getElementById('info_modal'), []);
      var content = document.querySelector(".modal #info_modal");
      if(mirror_type) {
        content.querySelectorAll('.section').forEach(function(s) { s.style.display = 'none'; });
        content.querySelector('.section.mirror').style.display = 'block';
      } else if(teaching_type) {
        content.querySelectorAll('.section').forEach(function(s) { s.style.display = 'none'; });
        content.querySelector('.section.teaching').style.display = 'block';
      }
    } else if(action == 'reconnect') {
      remote.reconnect();
    } else if(action == 'invite') {
      room.invite();
    } else if(action == 'settings') {
      var actions = [];
      room.settings = room.settings || {};
      var modal_content = null;
      var update_tracks = function() {
        var video_id = modal_content.querySelector('#video_select').value;
        var audio_id = modal_content.querySelector('#audio_select').value;
        if(room.settings.audio_device_id == audio_id && room.settings.video_device_id == video_id) {
          return;
        }
        room.settings.audio_device_id = audio_id;
        room.settings.video_device_id = video_id;
        room.temp_video_device_id = null;
        localStorage['vidspeak_settings'] = JSON.stringify(room.settings);
        room.update_from_settings();
      };
      var elem = document.getElementById('settings_modal');
      room.modal_analyser = null;
      elem.onattached = function(content) {
        modal_content = content;
        var video_track = remote.local_track('video');
        var audio_track = remote.local_track('audio');
        var current_video_id = video_track && video_track.device_id;
        var current_audio_id = audio_track && audio_track.device_id;
        var current_ids = {audio: current_audio_id, video: current_video_id};
        if(room.settings.audio_device_id != 'none') {
          room.settings.audio_device_id = current_audio_id || 'none';
        }
        if(room.settings.video_device_id != 'none') {
          room.settings.video_device_id = current_video_id || 'none';
        }
        room.check_inputs().then(function() {
          ['Audio', 'Video'].forEach(function(str) {
            var type = str.toLowerCase();
            var select = content.querySelector('#' + type + '_select');
            select.innerHTML = '';
            (room[type + '_inputs'] || []).forEach(function(input) {
              var option = document.createElement('option');
              option.value = input.deviceId;
              option.innerText = input.label;
              select.appendChild(option);
            });
            var option = document.createElement('option');
            option.value = 'none';
            option.innerText = "No " + str;
            select.appendChild(option);
            select.value = current_ids[type] || 'none';
          });
        });
        content.querySelector('#symbol_select').value = room.settings.symbol_library;
        content.querySelector('#tts_select').value = room.settings.tts;

        var video = content.querySelector('#settings_video_preview');
        if(video_track && video_track.mediaStreamTrack) {
          room.wire_track(video, video_track);
        }
        var audio = content.querySelector('#settings_audio_preview');
        if(audio_track && audio_track.mediaStreamTrack) {
          room.wire_track(audio, audio_track);
        }

        content.querySelector('#audio_select').addEventListener('change', function(e) {
          var value = e.target.value;
          room.handle_input_switch(value, audio, update_tracks);
        });
        content.querySelector('#video_select').addEventListener('change', function(e) {
          var value = e.target.value;
          room.handle_input_switch(value, video, update_tracks);
        });
        content.querySelector('#tts_select').addEventListener('change', function(e) {
          room.settings.tts = e.target.value || 'all';
          localStorage['vidspeak_settings'] = JSON.stringify(room.settings);
          room.send_update();
        });
        content.querySelector('#symbol_select').addEventListener('change', function(e) {
          content.querySelector('#settings_symbol_preview').className = e.target.value;
          if(e.target.value != room.settings.symbol_library) {
            room.settings.symbol_library = e.target.value;
            localStorage['vidspeak_settings'] = JSON.stringify(room.settings);
            room.assert_grid(room.buttons, room.grid_id, room.board_locale);
          }
        });
        var select = content.querySelector('#symbol_select');
        var event = new Event('change');
        select.dispatchEvent(event);
      };
      modal.open("Call Settings", elem, actions).then(function() {
        if(room.modal_analyser) { room.modal_analyser.release(); }
      }, function() {
        if(room.modal_analyser) { room.modal_analyser.release(); }
      });
    } else if(action == 'quick') {
      room.assert_grid(room.default_buttons, 'quick', room.default_locale, true);
    } else if(action == 'load') {
      var id = $(event.target).closest('.grid_option').attr('data-id');
      if(id) {
        var grid = boards.grids.find(function(g) { return g.id == id; });
        if(grid) {
          room.assert_grid(grid.buttons, grid.id, grid.locale, true);
        }
      }
      $button.find(".popover").css('display', 'none');
    } else if(action == 'share') {
      var actions = [];
      if(room.share_tracks) {
        actions.push({action: 'cancel', label: "End Share", callback: function() { room.end_share(); modal.close(); }});
      }
      if(room.image_sharing) {
        actions.push({action: 'image', label: "Picture", icon: 'image', callback: function() { room.share_image(); modal.close(); }});
      }
      if(room.video_sharing) {
        actions.push({action: 'video', label: "Video", icon: 'camera-video', callback: function() { room.share_video(); modal.close(); }});
      }
      if(room.screen_sharing) {
        actions.push({action: 'screen', label: "Screen", icon: 'fullscreen', callback: function() { room.share_screen(); modal.close(); }});
      }
      modal.open("Share Content", document.getElementById('share_modal'), actions);
    } else if(action == 'send') {
      var container = document.getElementsByClassName('reactions')[0];
      if($(event.target).closest(".reactions").length > 0 && event.target.tagName == 'IMG') {
        // container.parentNode.style.display = 'none';
        do_hide = false;
        room.send_image(event.target.src, event.target.alt);
      } else {
        container.parentNode.style.display = 'none';
      }
    }
    if(do_hide) {
      $(".popover:visible").css('display', 'none');
    }
  } else if($zoom.length > 0) {
    event.preventDefault();
    $zoom.blur();
    $("#nav")[0].hide_at = (new Date()).getTime() + 7000;
    if($("#nav").css('opacity') != '1') { return; }
    if($zoom.attr('data-direction') == 'in') {
      room.zoom(true);
    } else {
      room.zoom(false);
    }
  } else if(event.target.closest('.toggle') != null) {
    setTimeout(function() {
      room.swap_video();    
    }, input.compat.mobile ? 200 : 10);
  } else if(event.target.closest('.unmute,.mute') != null) {
    room.toggle_self_mute();
  }
});
if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
  room.camera = false;
}
var canvas_elem = document.createElement('canvas');
if(canvas_elem.captureStream) {
  var userAgent = window.navigator.userAgent.toLowerCase();
  if(input.compat.system == 'iOS') {
    // https://bugs.webkit.org/show_bug.cgi?id=181663
  } else {
    room.image_sharing = true;  
  }
}
var video_elem = document.createElement('video');
if(video_elem.captureStream || video_elem.mozCaptureStream) {
  room.video_sharing = true;
}
if(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
  room.screen_sharing = true;
}
document.addEventListener("turbolinks:load", function() {
  room.cleanup();
})

room.default_buttons = default_buttons;
