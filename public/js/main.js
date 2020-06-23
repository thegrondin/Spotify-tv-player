if (!window.fetch) throw new Error("Fetch api does not exist on this browser");
  
let playerState = {};

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

const statePosition = async () => {
  if (playerState.paused) {
      return playerState.position;
  }
  let position = playerState.position + (performance.now() - playerState.updateTime) ;
  return position > playerState.duration ? playerState.duration : position;
}

const waitForSpotifySDK = async () => {
  return new Promise(resolve => {
    if (window.Spotify) {
      resolve(window.Spotify);
    }
    else {
      window.onSpotifyWebPlaybackSDKReady = () => {
        resolve(window.Spotify);
      }
    }
  })
}

const setSongInfos = async (currentTrack) => {
  document.querySelector(".album-preview").style.background = `url('/ressources/${encodeURIComponent(currentTrack.album.images[0].url)}')`;
  document.querySelector(".current-song-name").innerText = currentTrack.name;
  document.querySelector(".current-artist").innerText = currentTrack.artists.map(artist => ` ${artist.name}`);
  document.querySelector(".current-album").innerText = currentTrack.album.name;
}

const updateTime = async () => { 

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

  setTimeout(updateTime, 100);
}

window.onSpotifyWebPlaybackSDKReady = () => {}

(async () => {

  const access = await SpotifyAccess();
  await StoreAccess(access);

  const {Player} = await waitForSpotifySDK();

  const player = new Player({
    name: 'TV Player',
    getOAuthToken: cb => {cb(localStorage['spotify_access_token'])}
  });

  player.addListener('initialization_error', ({ message }) => { console.error(message); });
  player.addListener('authentication_error', ({ message }) => { console.error(message); });
  player.addListener('account_error', ({ message }) => { console.error(message); });
  player.addListener('playback_error', ({ message }) => { console.error(message); });

  player.addListener('player_state_changed', state => { 
    setSongInfos(state.track_window.current_track);

    playerState.paused = state.paused;
    playerState.duration = state.duration;
    playerState.position = state.position;
    playerState.updateTime = performance.now();

  });

  player.addListener('ready', ({ device_id }) => {
    updateTime();
  });

  player.addListener('not_ready', ({ device_id }) => {
    console.log('Device ID has gone offline', device_id);
  });

  player.connect();

})();
