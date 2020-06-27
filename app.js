const express = require('express')
const app = express()
const request = require('request')
const path = require('path')
require('custom-env').env('staging')


app.get('/', function (req, res) {
    res.sendFile(path.join(path.resolve() + '/index.html') )
})

app.get('/ressources/:link', (req, res) => {
    res.redirect(req.params.link);
});

app.use('/public', express.static('public'))

app.get('/login', function(req, res) {
    var scopes = 'user-read-private user-read-email user-read-currently-playing user-read-playback-state streaming';
    res.redirect('https://accounts.spotify.com/authorize' +
      '?response_type=code' +
      '&client_id=' + process.env.CLIENT_ID +
      (scopes ? '&scope=' + encodeURIComponent(scopes) : '') +
      '&redirect_uri=' + encodeURIComponent('http://localhost:3000/spotify/access'));
    });

app.get('/spotify/access', (req, res) => {
    request.post({
        url : 'https://accounts.spotify.com/api/token', 
        headers: {
            'Authorization' : `Basic ${Buffer.from(`${process.env.CLIENT_ID}:${[process.env.CLIENT_SECRET]}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        form: {
            grant_type : "authorization_code",
            code : req.query.code,
            redirect_uri : 'http://localhost:3000/spotify/access'
        }},
        function (err, remoteResponse, remoteBody) {
            console.log(remoteBody)
            res.json( JSON.parse(remoteBody))
        }
    )
    
   
});

app.listen(3000, function () {
    console.log('The application is now listening on port 3000')
})