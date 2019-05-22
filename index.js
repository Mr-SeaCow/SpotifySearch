require('dotenv').config()
const fs = require('fs');
const express = require('express');
const spotifyID = process.env.SPOTIFY_CLIENT_ID;
const spotifySecret = process.env.SPOTIFY_SECRET;
const spotifyRedirect = process.env.SPOTIFY_REDIRECT
const SpotifyWebApi = require('spotify-web-api-node');
const port = 3000;
const app = express();
const router = express.Router();

let tokenExpiration;
let spotifyApi = new SpotifyWebApi({
  clientId: spotifyID,
  clientSecret: spotifySecret,
  redirectUri: spotifyRedirect
});

router.get('/', (req, res) => {
  var scopes = 'user-read-currently-playing';
  redirect_uri = 'http://localhost:3000/callback/'
  res.redirect('https://accounts.spotify.com/authorize' +
    '?response_type=code' +
    '&client_id=' + spotifyID +
    (scopes ? '&scope=' + encodeURIComponent(scopes) : '') +
    '&redirect_uri=' + encodeURIComponent(redirect_uri));
})

router.get('/callback', (req, res) => {
  let code = res.req._parsedUrl.search.replace('?code=', '');
  getAuthToken(code, res);
})

function getAuthToken(code, res) {
  spotifyApi.authorizationCodeGrant(code)
    .then(function (data) {

      res.send(`<script>window.alert('You can now close this tab!');</script>`);

      let access_token = data.body['access_token'];
      let refresh_token = data.body['refresh_token'];

      let loggedInSpotifyApi = new SpotifyWebApi();

      loggedInSpotifyApi.setClientId(spotifyID);
      loggedInSpotifyApi.setClientSecret(spotifySecret);
      loggedInSpotifyApi.setAccessToken(access_token);
      loggedInSpotifyApi.setRefreshToken(refresh_token);

      console.log(`You're connected!`);

      tokenExpiration = new Date().getTime() / 1000 + data.body['expires_in'];
      setInterval(() => { getCurrentTrack(loggedInSpotifyApi) }, 2000);
    }, function (err) {
      console.log('Something went wrong when retrieving the access token!');
    });
}

function refreshToken(loggedInSpotifyApi) {
  loggedInSpotifyApi.refreshAccessToken().then(
    function (data) {
      tokenExpiration = new Date().getTime() / 1000 + data.body['expires_in'];

      console.log('Successfully refreshed token.');

      setInterval(() => { getCurrentTrack(loggedInSpotifyApi) }, 2000);
    },
    function (err) {
      console.log('Could not refresh the token!');
    }
  );
}

function getCurrentTrack(loggedInSpotifyApi) {
  loggedInSpotifyApi.getMyCurrentPlayingTrack().then(function (data) {
    if (data.body.is_playing === true) {
      let item = data.body.item;
      let artists;

      for (let i = 0; i < item.artists.length; i++) {
        if (i == 0) {
          artists = item.artists[i].name
        } else if (i != item.artists.length - 1) {
          artists = artists + `, ${item.artists[i].name}`
        } else {
          if (item.artists.length == 2) {
            artists = artists + ` and ${item.artists[i].name}`
          } else {
            artists = artists + `, and ${item.artists[i].name}`
          }
        }
      }

      let name = item.name;
      let display = `"${name}" by ${artists}    `

      fs.readFile("./currentSong.txt", (err, data) => {
        if (data != display) {
          fs.writeFile("./currentSong.txt", display, function (err) {
            if (err) {
              return console.log(err);
            }
          });
          console.log(display)
        }
      });
    } else {
      display = ' '
      fs.readFile("./currentSong.txt", (err, data) => {
        if (data != display) {
          fs.writeFile("./currentSong.txt", display, function (err) {
            if (err) {
              return console.log(err);
            }
          });
          console.log(display)
        }
      });
    }
    let refreshTimeLeft = Math.floor(tokenExpiration - new Date().getTime() / 1000)
    if (refreshTimeLeft < 20) {
      clearInterval(this)
      refreshToken(loggedInSpotifyApi);
    }
  }, function (err) {
    console.error(err);
  })
}

app.use('/', router)
app.listen(port, ()=> {
  console.log(`You can initiate the procedure at http://localhost:${port}/`)
});
