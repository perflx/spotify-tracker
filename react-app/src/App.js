import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [friendsActivity, setFriendsActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [friendSpotifyID, setFriendSpotifyID] = useState('');

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadFriendsActivity();
      // Автообновление каждые 30 секунд
      const interval = setInterval(loadFriendsActivity, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  const checkAuth = async () => {
    try {
      const response = await axios.get('/me');
      setIsAuthenticated(true);
    } catch (error) {
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const loadFriendsActivity = async () => {
    try {
      const response = await axios.get('/widget/friends-activity');
      setFriendsActivity(response.data.friends || []);
    } catch (error) {
      console.error('Ошибка загрузки активности друзей:', error);
    }
  };

  const addFriend = async () => {
    if (!friendSpotifyID.trim()) {
      alert('Введите Spotify ID друга');
      return;
    }

    try {
      await axios.post('/friends/add', { friendSpotifyID: friendSpotifyID.trim() });
      alert('Друг добавлен!');
      setFriendSpotifyID('');
      setShowAddFriend(false);
      loadFriendsActivity();
    } catch (error) {
      alert('Ошибка: ' + (error.response?.data?.message || 'Неизвестная ошибка'));
    }
  };

  if (loading) {
    return (
      <div className="app">
        <div className="loading">Загрузка...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="app">
        <div className="header">
          <h1>Spotify Friends</h1>
          <p>Смотри, что слушают твои друзья</p>
        </div>
        <div className="login-section">
          <a href="/login" className="login-btn">Войти через Spotify</a>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="header">
        <h1>Spotify Friends</h1>
        <p>Смотри, что слушают твои друзья</p>
      </div>

      <div className="controls">
        <button className="btn" onClick={loadFriendsActivity}>
          Обновить
        </button>
        <button className="btn" onClick={() => setShowAddFriend(!showAddFriend)}>
          Добавить друга
        </button>
      </div>

      {showAddFriend && (
        <div className="add-friend-form">
          <h3>Добавить друга</h3>
          <input
            type="text"
            value={friendSpotifyID}
            onChange={(e) => setFriendSpotifyID(e.target.value)}
            placeholder="Spotify ID друга"
          />
          <button onClick={addFriend}>Добавить</button>
        </div>
      )}

      <div className="friends-grid">
        {friendsActivity.length > 0 ? (
          friendsActivity.map((friend, index) => (
            <FriendCard key={index} friend={friend} />
          ))
        ) : (
          <div className="no-friends">
            У вас пока нет друзей или никто не слушает музыку
          </div>
        )}
      </div>
    </div>
  );
}

function FriendCard({ friend }) {
  return (
    <div className="friend-card">
      <h3>👤 {friend.spotifyID}</h3>
      {friend.isPlaying && friend.song ? (
        <div className="song-info">
          <img src={friend.song.image} alt="Album cover" className="song-image" />
          <div className="song-details">
            <h4>{friend.song.name}</h4>
            <p>{friend.song.artist}</p>
            <p>{friend.song.album}</p>
          </div>
        </div>
      ) : (
        <div className="not-playing">Не слушает музыку</div>
      )}
    </div>
  );
}

export default App;
