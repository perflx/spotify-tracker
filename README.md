# Spotify Friends Widget

A full-stack web app that lets you connect your Spotify account and see what your friends are currently listening to.

Built with a Node.js/Express backend, MongoDB, a React frontend and the Spotify Web API.

> **Status:** work in progress. Authentication, persistence, friend management and playback tracking work; see [Known Limitations](#known-limitations).

## Features

- Spotify login via OAuth 2.0 Authorization Code flow with PKCE
- Session-based authentication (server-side sessions)
- Access/refresh token storage in MongoDB (Mongoose)
- Token refresh for the logged-in user's own requests
- Add and remove friends by Spotify ID
- Currently playing track, artist, album and cover art for each friend
- Auto-refresh of friends' activity every 30 seconds
- React frontend

## Tech Stack

| Layer    | Technologies                                  |
| -------- | --------------------------------------------- |
| Backend  | Node.js, Express, Mongoose, Axios, express-session |
| Database | MongoDB (Atlas)                               |
| Frontend | React (JavaScript), Axios, CSS                |
| API      | Spotify Web API                               |

## How Authentication Works

1. `/login` generates a random `state` and a PKCE `code_verifier`, stores them in the session, and redirects the user to Spotify with the hashed `code_challenge`.
2. After the user approves, Spotify redirects back to `/callback` with an authorization code.
3. The server checks that `state` matches, then exchanges the code + `code_verifier` for an access token and a refresh token.
4. The user's Spotify ID and tokens are saved in MongoDB; only the Spotify ID is kept in the session.
5. Other endpoints read the Spotify ID from the session, load the tokens from MongoDB and call the Spotify API on the user's behalf.

## API

| Method | Endpoint                   | Description                                   |
| ------ | -------------------------- | --------------------------------------------- |
| GET    | `/login`                   | Start Spotify authentication                  |
| GET    | `/callback`                | Spotify OAuth callback                        |
| GET    | `/me`                      | Authenticated user's Spotify profile          |
| GET    | `/current-song`            | Authenticated user's current playback         |
| GET    | `/friends`                 | List friends                                  |
| POST   | `/friends/add`             | Add a friend by Spotify ID                    |
| DELETE | `/friends/remove`          | Remove a friend                               |
| GET    | `/widget/friends-activity` | Current playback of all friends               |

## Running Locally

### 1. Clone

```bash
git clone https://github.com/perflx/spotify-tracker.git
cd spotify-tracker
```

### 2. Spotify app

Create an app in the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) and add this Redirect URI (Spotify does not accept `localhost`, use the loopback IP):

```
http://127.0.0.1:3001/callback
```

The app runs in Spotify's development mode, so every account that should log in (including friends) must be added under **User Management** in the Dashboard.

### 3. Environment

Create a `.env` file in the project root:

```env
CLIENT_ID=your_spotify_client_id
CLIENT_SECRET=your_spotify_client_secret
REDIRECT_URI=http://127.0.0.1:3001/callback
MONGODB_URI=your_mongodb_connection_string
SESSION_SECRET=your_session_secret
PORT=3001
```

### 4. Backend

```bash
npm install
npm start
```

### 5. Frontend

```bash
cd react-app
npm install
npm start
```

Open the app via `http://127.0.0.1:3001` (not `localhost`) so the session cookie matches the redirect host.

## Project Structure

```
spotify-tracker/
├── server.js        # Express server and REST API
├── public/          # Static files served by Express
├── react-app/       # React frontend
│   └── src/         # App.js, App.css, index.js
├── package.json
└── README.md
```

## Known Limitations

- Friends' access tokens are not refreshed automatically, so the friends' activity widget stops updating after about an hour until they log in again.
- Friends can be added by Spotify ID without confirmation from the other user.
- Sessions use the default in-memory store and expire after 10 minutes.
- Tokens are stored unencrypted in the database.

## Roadmap

- Shared token-refresh helper used by all endpoints (including friends)
- Friend requests with confirmation
- Persistent session store (`connect-mongo`)
- Migration to TypeScript