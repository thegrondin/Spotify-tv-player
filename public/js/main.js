if (!window.fetch) throw new Error("Fetch api does not exist on this browser");

/*curl -X "GET" "https://api.spotify.com/v1/me/player" -H "Accept: application/json" -H "Content-Type: application/json" -H "Authorization: Bearer "*/

const SpotifyAccess = async () => {
  const res = await fetch("login", { mode: 'no-cors' });
  return res.json();
}

const StoreAccess = async (access) => {
  localStorage.setItem('spotify_access_token', access.access_token);
  localStorage.setItem('spotify_expires_in', access.expires_in);
  localStorage.setItem('spotify_refresh_token', access.refresh_token);
  localStorage.setItem('spotify_token_type', access.token_type);
}

const TestApi = async (access) => {

  console.log({ 'Authorization' : `Bearer ${localStorage['spotify_access_token']}`,
  'Content-Type' : 'application/json',
  'Accept' : 'application/json'})

  const res = await fetch("https://api.spotify.com/v1/me", {
    method: 'get',
    headers: new Headers({
      'Authorization' : `Bearer ${localStorage['spotify_access_token']}`,
      'Content-Type' : 'application/json',
      'Accept' : 'application/json'
    })
  })

  return res.json();
}

async function resolvedTest() {
  console.log("calling");
  const result = await SpotifyAccess();
  await StoreAccess(result);
  const userInfos = await TestApi();
  console.log(userInfos);
}




resolvedTest();

const GetCurrentSongTimestamp = async () => {
  const res = await fetch("https://api.spotify.com/v1/me/player", {
    method: 'get',
    headers: new Headers({
      'Authorization' : `Bearer ${localStorage['spotify_access_token']}`,
      'Content-Type' : 'application/json',
      'Accept' : 'application/json'
    })
  })

  return res.json();
}

let playerState = {};


const statePosition = async () => {
  if (playerState.paused) {
      return playerState.position;
  }
  let position = playerState.position + (performance.now() - playerState.updateTime) ;
  return position > playerState.duration ? playerState.duration : position;
}

window.onSpotifyWebPlaybackSDKReady = () => {
  const token = '_____YOUR_TOKEN____'; // TODO: make a call to server to get that token
  const player = new Spotify.Player({
    name: 'Web Playback SDK Quick Start Player',
    getOAuthToken: cb => { cb(token); }
  });

  // Error handling
  player.addListener('initialization_error', ({ message }) => { console.error(message); });
  player.addListener('authentication_error', ({ message }) => { console.error(message); });
  player.addListener('account_error', ({ message }) => { console.error(message); });
  player.addListener('playback_error', ({ message }) => { console.error(message); });

  // Playback status updates
  player.addListener('player_state_changed', state => { 
    console.log(state);
    document.querySelector(".album-preview").style.background = `url('/ressources/${encodeURIComponent(state.track_window.current_track.album.images[0].url)}')`;
    document.querySelector(".current-song-name").innerText = state.track_window.current_track.name;
    document.querySelector(".current-artist").innerText = state.track_window.current_track.artists.map(artist => {
      return ` ${artist.name}`;
    });

    document.querySelector(".current-album").innerText = state.track_window.current_track.album.name;

    playerState.paused = state.paused;
    playerState.duration = state.duration;
    playerState.position = state.position;
    playerState.updateTime = performance.now();

    //etCurrentSontTimestamp({progress})

  });

  // Ready
  player.addListener('ready', ({ device_id }) => {
    console.log('Ready with Device ID', device_id);
    
    async function updatePlayer() { 

      const position = await statePosition()
      const normalizedProgress = position / playerState.duration * 100;
      document.querySelector('.player-progress').style.width = `${normalizedProgress.toFixed(1)}%`
      document.querySelector('.player-time-indicator').style.marginLeft = `calc(${normalizedProgress.toFixed(1)}% - 35px)`

      let h = Math.floor(position/1000/60/60);
      let m = Math.floor((position/1000/60/60 - h)*60);
      let s = Math.floor(((position/1000/60/60 - h)*60 - m)*60);

      s < 10 ? s = `0${s}`: s = `${s}`
      m < 10 ? m = `0${m}`: m = `${m}`

      document.querySelector('.player-time-indicator .text-block').innerText = `${m}:${s}`



      setTimeout(updatePlayer, 100);
    }
    updatePlayer();
  });

  // Not Ready
  player.addListener('not_ready', ({ device_id }) => {
    console.log('Device ID has gone offline', device_id);
  });

  // Connect to the player!
  player.connect();
};

