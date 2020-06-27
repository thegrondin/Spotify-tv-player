if (!window.fetch) throw new Error("Fetch api does not exist on this browser");
  
let playerState = {};

const SpotifyAccess = async () => (await fetch("login", { mode: 'no-cors' })).json();

const StoreAccess = async (access) => {
  localStorage.setItem('spotify_access_token', access.access_token);
  localStorage.setItem('spotify_expires_in', access.expires_in);
  localStorage.setItem('spotify_refresh_token', access.refresh_token);
  localStorage.setItem('spotify_token_type', access.token_type);
}

const refreshToken = async () => {
  return (await fetch(`spotify/refresh?refresh_token=${encodeURIComponent(localStorage["spotify_refresh_token"])}`, {
    mode: 'no-cors',
    method: 'GET'
  })).json();
}

const setRefreshInterval = async () => {
  refreshToken();
  setTimeout(setRefreshInterval, parseInt(localStorage['spotify_expires_in']) * 1000);
}

const statePosition = async () => {
  if (playerState.paused) {
      return playerState.position;
  }
  let position = playerState.position + (performance.now() - playerState.updateTime);
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
  });
}

const isEmpty = (obj) => !obj || Object.keys(obj).length === 0;

const setSongInfos = async (currentTrack) => {

  let binding = {
    album: {},
    name: "",
    artists : "",

  }

  if (!isEmpty(currentTrack)) {

    binding.album = {
      name : currentTrack.album.name,
      preview : `url('/ressources/${encodeURIComponent(currentTrack.album.images[0].url)}')`
    };

    binding.name = currentTrack.name;
    binding.artists = currentTrack.artists.map(artist => ` ${artist.name}`);
  }

  (!isEmpty(binding.album)) ? document.querySelector(".album-preview").classList.remove('inactive') : document.querySelector(".album-preview").classList.add('inactive');
  document.querySelector(".album-preview").style.background = binding.album.preview || '';
  document.querySelector(".current-song-name").innerText = binding.name;
  document.querySelector(".current-artist").innerText = binding.artists;
  document.querySelector(".current-album").innerText = binding.album.name || '';
}

const updateTime = async () => { 
  const position = await statePosition() || 0;
  const normalizedProgress = (position / playerState.duration * 100) || 3;
  document.querySelector('.player-progress').style.width = `${normalizedProgress.toFixed(1)}%`;
  document.querySelector('.player-time-indicator').style.marginLeft = `calc(${normalizedProgress.toFixed(1)}% - 35px)`;

  let h = Math.floor(position/1000/60/60);
  let m = Math.floor((position/1000/60/60 - h)*60);
  let s = Math.floor(((position/1000/60/60 - h)*60 - m)*60);

  s < 10 ? s = `0${s}`: s = `${s}`;
  m < 10 ? m = `0${m}`: m = `${m}`;

  document.querySelector('.player-time-indicator .text-block').innerText = `${m}:${s}`;

  setTimeout(updateTime, 100);
}

const setPlayState = async (paused) => {


  let playBtn = document.querySelector('.play-button');
  if (!paused && paused !== undefined) {
    playBtn.classList.add('active');
    playBtn.querySelector('img').src = 'public/images/pause.svg';
    return;
  }

  playBtn.querySelector('img').src = 'public/images/icons8-play-96.png';
  playBtn.classList.remove('active');
}

const setShuffleState = async (shuffle) => {
  let shuffleButton = document.querySelector('.shuffle-button');
  if (shuffle) {
    shuffleButton.classList.add('active');
    return
  }

  shuffleButton.classList.remove('active');
}

window.onSpotifyWebPlaybackSDKReady = () => {}

(async () => {

  const access = await SpotifyAccess();

  setRefreshInterval();

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
    state = state || {};
    state.track_window = state.track_window || {};

    setSongInfos(state.track_window.current_track);
    setPlayState(state.paused);
    setShuffleState(state.shuffle);

    playerState.paused = state.paused;
    playerState.duration = state.duration;
    playerState.position = state.position;
    playerState.updateTime = performance.now();


  });

  player.addListener('ready', () => {
    updateTime();
  });

  player.addListener('not_ready', ({ device_id }) => {
    console.log('Device ID has gone offline', device_id);
  });

  player.connect();

})();
