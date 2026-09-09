# Spotify Friends Widget

A full-stack web application that lets users connect their Spotify accounts and see what their friends are currently listening to.

The project integrates the Spotify Web API with a Node.js/Express backend, MongoDB persistence, and a React frontend.

## Features

* Spotify authentication using OAuth 2.0 Authorization Code flow with PKCE
* Session-based authentication
* Access and refresh token handling
* MongoDB persistence with Mongoose
* Add and remove friends
* View friends' current Spotify activity
* Display currently playing track, artist, album and cover art
* Automatic activity refresh every 30 seconds
* React-based frontend with responsive UI
* REST API built with Express

## Tech Stack

### Backend

* Node.js
* Express.js
* MongoDB
* Mongoose
* Axios
* Express Session

### Frontend

* React
* Axios
* CSS

### External API

* Spotify Web API

## How It Works

The application uses Spotify's OAuth 2.0 Authorization Code flow with PKCE.

1. The user starts the login process.
2. The server generates a `state` value and a PKCE `code_verifier`.
3. The user is redirected to Spotify for authorization.
4. Spotify redirects the user back to the application with an authorization code.
5. The server validates the `state` value and exchanges the authorization code for Spotify access and refresh tokens.
6. The user's Spotify ID and tokens are stored in MongoDB.
7. The user's Spotify ID is stored in the server-side session.
8. The backend uses the stored Spotify access token to retrieve the user's current playback and their friends' activity.

## API

### Authentication

| Method | Endpoint    | Description                                  |
| ------ | ----------- | -------------------------------------------- |
| GET    | `/login`    | Start Spotify authentication                 |
| GET    | `/callback` | Handle Spotify OAuth callback                |
| GET    | `/me`       | Get the authenticated user's Spotify profile |

### Friends

| Method | Endpoint          | Description                |
| ------ | ----------------- | -------------------------- |
| GET    | `/friends`        | Get the user's friends     |
| POST   | `/friends/add`    | Add a friend by Spotify ID |
| DELETE | `/friends/remove` | Remove a friend            |

### Playback

| Method | Endpoint                   | Description                                   |
| ------ | -------------------------- | --------------------------------------------- |
| GET    | `/current-song`            | Get the authenticated user's current playback |
| GET    | `/widget/friends-activity` | Get current playback information for friends  |

## Running Locally

### 1. Clone the repository

```bash
git clone https://github.com/perflx/spotify-tracker.git
cd spotify-tracker
```

### 2. Configure the backend

Create a `.env` file in the project root:

```env
CLIENT_ID=your_spotify_client_id
CLIENT_SECRET=your_spotify_client_secret
REDIRECT_URI=http://localhost:3001/callback
MONGODB_URI=your_mongodb_connection_string
SESSION_SECRET=your_session_secret
PORT=3001
```

Create an application in the Spotify Developer Dashboard and add the following redirect URI:

```text
http://localhost:3001/callback
```

### 3. Install backend dependencies

```bash
npm install
```

### 4. Start the backend

```bash
npm start
```

The backend runs on:

```text
http://localhost:3001
```

### 5. Start the React frontend

```bash
cd react-app
npm install
npm start
```

The React development server runs on:

```text
http://localhost:3000
```

## Project Structure

```text
spotify-tracker/
├── server.js              # Express server and REST API
├── public/                # Static frontend
├── react-app/             # React frontend
│   ├── src/
│   │   ├── App.js
│   │   ├── App.css
│   │   └── index.js
│   └── package.json
├── package.json
└── README.md
```

## Project Status

This project is a functional student project / prototype.

It was built as an exploration of full-stack web development and third-party API integration. The current implementation focuses on authentication, persistence, friend management and Spotify playback tracking.

