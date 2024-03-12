import express from 'express';
import cors from 'cors';
import querystring from 'querystring';
import fetch from 'node-fetch';
import cookieParser from 'cookie-parser';


const app = express();

app.use(cors({
    origin: ["http://localhost:3000"]
}));
app.use(express.json());
app.use(cookieParser());

import dotenv from 'dotenv';
dotenv.config({});

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
let REDIRECT_URI = process.env.REDIRECT_URI || 'http://localhost:8080/callback';
let FRONTEND_URI = process.env.FRONTEND_URI || 'http://localhost:3000';
const PORT = process.env.PORT || 8080;


const generateRandomString = (length) => {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < length; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
};

const stateKey = 'authState';

app.get('/login', async (req, res) => {
    const state = generateRandomString(16);
    const scope = 'user-read-email user-read-private user-library-read user-library-modify user-read-playback-position user-top-read user-read-recently-played user-follow-read playlist-modify-public playlist-modify-private playlist-read-collaborative playlist-read-private user-read-currently-playing user-modify-playback-state user-read-playback-state';

    res.cookie(stateKey, state);

    res.redirect(`https://accounts.spotify.com/authorize?${querystring.stringify({
            response_type: 'code',
            client_id: CLIENT_ID,
            scope: scope,
            redirect_uri: REDIRECT_URI,
            state: state,
        })}`,
    );
});

app.get('/callback', async (req, res) => {
    const code = req.query.code;
    const state = req.query.state;
    const storedState = req.cookies ? req.cookies[stateKey] : null;

    if (state === null || state !== storedState) {
        res.redirect(`/#${querystring.stringify({ error: 'state_mismatch' })}`);
    } else {
        res.clearCookie(stateKey);
        const options = {
            code: code,
            redirect_uri: REDIRECT_URI,
            grant_type: 'authorization_code',
        };

        try {
            const response = await fetch('https://accounts.spotify.com/api/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': 'Basic ' + (new Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString(
                    'base64')),
                },
                body: new URLSearchParams(options)
            });
            const json = await response.json();
            const access_token = json.access_token;
            const refresh_token = json.refresh_token;
            
            res.redirect(`${FRONTEND_URI}/#${querystring.stringify({
                    access_token,
                    refresh_token,
                })}`,
            );
        } catch (err) {
            console.log(err)
        }
    }
});

app.get('/refresh_token', async (req, res) => {
    const refresh_token = req.query.refresh_token;
    const options = {
        grant_type: 'refresh_token',
        refresh_token: refresh_token,
    };

    try {
        const response = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic ' + (new Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString(
                'base64')),
            },
            body: new URLSearchParams(options)
        });
        const json = await response.json();
        const access_token = json.access_token;
        res.json(access_token);
    } catch (err) {
        console.log(err)
    }
});

app.listen(PORT, () =>{
    console.log(`Server is running on port ${PORT}`);
});