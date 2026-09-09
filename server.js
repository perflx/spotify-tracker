const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();
const axios = require('axios');
const crypto = require('crypto');
const querystring = require('querystring');
const { access } = require('fs');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 3001;
app.use(express.json());

// Раздача статических файлов (HTML, CSS, JS)
app.use(express.static('public'));


app.use(session({
    secret: process.env.SESSION_SECRET || 'fallback-secret-key-change-in-production',
    resave: false,
    saveUninitialized: true,
    cookie: { 
        secure: true,
        maxAge: 600000, // 10 mins each session
        httpOnly: true
    }
}));

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Подключено к MongoDB успешно'))
  .catch(err => {
    console.error(' Ошибка подключения к MongoDB:', err.message);
    console.error('Проверьте:');
    console.error('1. Правильность MONGODB_URI в .env файле');
    console.error('2. Доступность IP-адреса в MongoDB Atlas Network Access');
    console.error('3. Правильность username/password');
  });

const userSchema = new mongoose.Schema({
    spotifyID: {
        type: String,
        required: true,
        unique: true,
    },

    accessToken: {
        type: String,
        required: true,
    },

    refreshToken: {
        type: String,
        required: true,
    },

    friends: [String]

})

const User = mongoose.model('User', userSchema);



const generateRandomString = (length) => {
    return crypto
      .randomBytes(60)
      .toString('hex')
      .slice(0, length);
  };
  
const sha256 = (plain) => {
    const hash = crypto.createHash('sha256');
    hash.update(plain);
    return hash.digest();
};
  
const base64encode = (input) => {
    return input.toString('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
};

// Функция для обновления access token
const refreshAccessToken = async (refreshToken) => {
    try {
        const response = await axios.post('https://accounts.spotify.com/api/token', 
            querystring.stringify({
                grant_type: 'refresh_token',
                refresh_token: refreshToken,
                client_id: process.env.CLIENT_ID,
            }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );
        
        return response.data.access_token;
    } catch (error) {
        console.error('Ошибка при обновлении токена:', error.response?.data || error.message);
        throw error;
    }
};

app.get('/login', async (req, res) => {
    const state = generateRandomString(16);
    const codeVerifier = generateRandomString(128); // Генерируем новый верификатор
    
    // Сохраняем code_verifier в сессии
    req.session.codeVerifier = codeVerifier;
    req.session.state = state;
    
    console.log('Login: Сохраняем в сессию:', { 
        state, 
        sessionID: req.sessionID,
        hasCodeVerifier: !!req.session.codeVerifier 
    });
    
    const hashed = sha256(codeVerifier);
    const codeChallenge = base64encode(hashed);
    
    // Определи нужные тебе скоупы (права доступа)
    const scope = 'user-read-private user-read-email user-follow-read user-read-currently-playing';
    
    const authUrl = 'https://accounts.spotify.com/authorize?' +
        'response_type=code' +
        '&client_id=' + process.env.CLIENT_ID +
        '&scope=' + encodeURIComponent(scope) +
        '&redirect_uri=' + encodeURIComponent(process.env.REDIRECT_URI) +
        '&state=' + state +
        '&code_challenge_method=S256' +
        '&code_challenge=' + codeChallenge;

    res.redirect(authUrl);
});

app.get('/callback', async (req, res) => {
    const code = req.query.code || null;
    const state = req.query.state || null;
    
    console.log('Callback: Получены данные:', { 
        code: code ? 'есть' : 'нет',
        state,
        sessionID: req.sessionID,
        sessionState: req.session.state,
        hasCodeVerifier: !!req.session.codeVerifier
    });
    
    // Проверяем наличие кода авторизации
    if (!code) {
        return res.status(400).send('Код авторизации не получен от Spotify');
    }
    
    // Проверяем переменные окружения
    if (!process.env.CLIENT_ID || !process.env.REDIRECT_URI) {
        console.error('Отсутствуют переменные окружения: CLIENT_ID или REDIRECT_URI');
        return res.status(500).send('Ошибка конфигурации сервера');
    }
    
    // Проверяем state для безопасности
    if (state !== req.session.state) {
        console.error('Неверный state:', { received: state, expected: req.session.state });
        return res.status(400).send('Неверный state параметр');
    }
    
    const codeVerifier = req.session.codeVerifier;
    if (!codeVerifier) {
        console.error('Code verifier не найден в сессии');
        return res.status(400).send('Code verifier не найден в сессии');
    }
    
    const authOptions = {
        method: 'post',
        url: 'https://accounts.spotify.com/api/token',
        data: querystring.stringify({
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: process.env.REDIRECT_URI,
            client_id: process.env.CLIENT_ID,
            client_secret: process.env.CLIENT_SECRET,
            code_verifier: codeVerifier,
        }),
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    };
    
    try {
        const response = await axios(authOptions);
        const { access_token, refresh_token } = response.data;
        
        // Получаем уникальный ID пользователя от Spotify
        const meResponse = await axios.get('https://api.spotify.com/v1/me', {
            headers: { 'Authorization': `Bearer ${access_token}` }
        });
        const spotifyID = meResponse.data.id;

        // Сохраняем/обновляем данные пользователя в БД
        const user = await User.findOneAndUpdate(
            { spotifyID: spotifyID },
            {
                accessToken: access_token,
                refreshToken: refresh_token
            },
            {
                upsert: true, 
                new: true     
            }
        );

        // Сохраняем Spotify ID в сессии, чтобы потом его использовать
        req.session.spotifyID = spotifyID;
        
        // Очищаем временные данные из сессии
        delete req.session.codeVerifier;
        delete req.session.state;

        // Перенаправляем пользователя на маршрут /current-song, чтобы он увидел текущий трек
        res.redirect('/current-song');

    } catch (error) {
        console.error('Ошибка при обработке обратного вызова:', error.response ? error.response.data : error.message);
        console.error('Полная ошибка:', error);
        
        // Более детальная обработка ошибок
        if (error.response) {
            const status = error.response.status;
            const data = error.response.data;
            
            if (status === 400) {
                return res.status(400).send(`Ошибка авторизации: ${data.error_description || data.error || 'Неверные параметры запроса'}`);
            } else if (status === 401) {
                return res.status(401).send(`Ошибка авторизации: ${data.error_description || 'Неверные учетные данные'}`);
            } else {
                return res.status(500).send(`Ошибка сервера Spotify: ${data.error_description || 'Неизвестная ошибка'}`);
            }
        } else if (error.code === 'ECONNREFUSED') {
            return res.status(500).send('Не удается подключиться к Spotify API. Проверьте интернет-соединение.');
        } else {
            return res.status(500).send(`Ошибка при авторизации: ${error.message}`);
        }
    }
});



app.get('/me', async (req, res) => {
    // Получаем ID пользователя из сессии
    const spotifyID = req.session.spotifyID;

    if (!spotifyID) {
        return res.status(401).send('Пользователь не авторизован.');
    }

    try {
        // Находим пользователя в БД по его ID
        const user = await User.findOne({ spotifyID });
        
        if (!user) {
            return res.status(404).send('Пользователь не найден в базе данных.');
        }
        
        // Теперь у нас есть access_token для этого конкретного пользователя
        const accessToken = user.accessToken;

        const response = await axios.get('https://api.spotify.com/v1/me', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        res.json(response.data);

    } catch (error) {
        console.error('Ошибка при запросе к API Spotify:', error.response ? error.response.data : error.message);
        
        // Если токен истек, пытаемся обновить его
        if (error.response?.status === 401) {
            try {
                const newAccessToken = await refreshAccessToken(user.refreshToken);
                await User.findOneAndUpdate(
                    { spotifyID },
                    { accessToken: newAccessToken }
                );
                
                // Повторяем запрос с новым токеном
                const retryResponse = await axios.get('https://api.spotify.com/v1/me', {
                    headers: { 'Authorization': `Bearer ${newAccessToken}` }
                });
                return res.json(retryResponse.data);
            } catch (refreshError) {
                console.error('Не удалось обновить токен:', refreshError.message);
                return res.status(401).send('Токен истек и не может быть обновлен. Пожалуйста, авторизуйтесь заново.');
            }
        }
        
        res.status(500).send('Не удалось получить данные пользователя.');
    }
});




app.get('/ping', (req, res) =>{
  res.send('pong');
})

// ===== ЭНДПОИНТЫ ДЛЯ ДРУЗЕЙ =====

// Добавить друга
app.post('/friends/add', async (req, res) => {
    const spotifyID = req.session.spotifyID;
    const { friendSpotifyID } = req.body;

    if (!spotifyID) {
        return res.status(401).send('Пользователь не авторизован');
    }

    if (!friendSpotifyID) {
        return res.status(400).send('Не указан ID друга');
    }

    try {
        // Проверяем, существует ли друг
        const friend = await User.findOne({ spotifyID: friendSpotifyID });
        if (!friend) {
            return res.status(404).send('Пользователь не найден');
        }

        // Добавляем друга
        const user = await User.findOneAndUpdate(
            { spotifyID: spotifyID },
            { $addToSet: { friends: friendSpotifyID } }, // $addToSet не добавляет дубликаты
            { new: true }
        );

        res.json({ message: 'Друг добавлен', friends: user.friends });
    } catch (error) {
        console.error('Ошибка при добавлении друга:', error);
        res.status(500).send('Ошибка сервера');
    }
});

// Удалить друга
app.delete('/friends/remove', async (req, res) => {
    const spotifyID = req.session.spotifyID;
    const { friendSpotifyID } = req.body;

    if (!spotifyID) {
        return res.status(401).send('Пользователь не авторизован');
    }

    try {
        const user = await User.findOneAndUpdate(
            { spotifyID: spotifyID },
            { $pull: { friends: friendSpotifyID } },
            { new: true }
        );

        res.json({ message: 'Друг удален', friends: user.friends });
    } catch (error) {
        console.error('Ошибка при удалении друга:', error);
        res.status(500).send('Ошибка сервера');
    }
});

// Получить список друзей
app.get('/friends', async (req, res) => {
    const spotifyID = req.session.spotifyID;

    if (!spotifyID) {
        return res.status(401).send('Пользователь не авторизован');
    }

    try {
        const user = await User.findOne({ spotifyID });
        if (!user) {
            return res.status(404).send('Пользователь не найден');
        }

        // Получаем информацию о друзьях
        const friends = await User.find({ spotifyID: { $in: user.friends } });
        
        res.json({ friends: friends.map(friend => ({
            spotifyID: friend.spotifyID,
            // Можно добавить больше информации о друге
        })) });
    } catch (error) {
        console.error('Ошибка при получении друзей:', error);
        res.status(500).send('Ошибка сервера');
    }
});

// ===== ЭНДПОИНТ ДЛЯ ВИДЖЕТА =====

// Получить данные для виджета (что слушают друзья)
app.get('/widget/friends-activity', async (req, res) => {
    const spotifyID = req.session.spotifyID;

    if (!spotifyID) {
        return res.status(401).send('Пользователь не авторизован');
    }

    try {
        // Получаем пользователя и его друзей
        const user = await User.findOne({ spotifyID });
        if (!user || !user.friends || user.friends.length === 0) {
            return res.json({ friends: [] });
        }

        // Получаем информацию о друзьях
        const friends = await User.find({ spotifyID: { $in: user.friends } });
        
        // Получаем текущие песни для каждого друга
        const friendsActivity = await Promise.all(
            friends.map(async (friend) => {
                try {
                    // Запрашиваем текущую песню друга
                    const response = await axios.get('https://api.spotify.com/v1/me/player/currently-playing', {
                        headers: { 'Authorization': `Bearer ${friend.accessToken}` }
                    });

                    if (response.status === 204 || !response.data) {
                        return {
                            spotifyID: friend.spotifyID,
                            isPlaying: false,
                            song: null
                        };
                    }

                    return {
                        spotifyID: friend.spotifyID,
                        isPlaying: response.data.is_playing,
                        song: {
                            name: response.data.item.name,
                            artist: response.data.item.artists[0].name,
                            album: response.data.item.album.name,
                            image: response.data.item.album.images[0]?.url,
                            duration: response.data.item.duration_ms,
                            progress: response.data.progress_ms
                        }
                    };
                } catch (error) {
                    // Если токен друга истек или другая ошибка
                    return {
                        spotifyID: friend.spotifyID,
                        isPlaying: false,
                        song: null,
                        error: 'Не удалось получить данные'
                    };
                }
            })
        );

        res.json({ 
            friends: friendsActivity,
            lastUpdated: new Date().toISOString()
        });

    } catch (error) {
        console.error('Ошибка при получении активности друзей:', error);
        res.status(500).send('Ошибка сервера');
    }
});

//Endpoint for current song
app.get('/current-song', async (req, res) => {
    // Получаем ID пользователя из сессии
    const spotifyID = req.session.spotifyID;

    if (!spotifyID) {
        return res.status(401).send('Пользователь не авторизован.');
    }

    try {
        // Находим пользователя в БД, чтобы получить его access_token
        const user = await User.findOne({ spotifyID });
        
        if (!user) {
            return res.status(404).send('Пользователь не найден в базе данных.');
        }
        
        const accessToken = user.accessToken;

        // Запрашиваем информацию о текущей песне
        const response = await axios.get('https://api.spotify.com/v1/me/player/currently-playing', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        // Проверяем, играет ли что-то. Если нет, Spotify возвращает пустой ответ (204 No Content)
        if (response.status === 204 || !response.data) {
            return res.send('Ничего не играет.');
        }

        // Отправляем данные песни в ответ
        res.send(response.data);

    } catch (error) {
        console.error('Ошибка при запросе к API Spotify:', error.response ? error.response.data : error.message);
        
        // Если токен истек, пытаемся обновить его
        if (error.response?.status === 401) {
            try {
                const newAccessToken = await refreshAccessToken(user.refreshToken);
                await User.findOneAndUpdate(
                    { spotifyID },
                    { accessToken: newAccessToken }
                );
                
                // Повторяем запрос с новым токеном
                const retryResponse = await axios.get('https://api.spotify.com/v1/me/player/currently-playing', {
                    headers: { 'Authorization': `Bearer ${newAccessToken}` }
                });
                
                if (retryResponse.status === 204 || !retryResponse.data) {
                    return res.send('Ничего не играет.');
                }
                
                return res.send(retryResponse.data);
            } catch (refreshError) {
                console.error('Не удалось обновить токен:', refreshError.message);
                return res.status(401).send('Токен истек и не может быть обновлен. Пожалуйста, авторизуйтесь заново.');
            }
        }
        
        res.status(500).send('Не удалось получить данные о песне.');
    }
});

app.listen(PORT, ()=>{
  console.log(`Server is running on ${PORT}`);
})

// app.get('/todo', async (req, res) => {
//   try{
//     const response = await axios.get('https://19f9021937d5.ngrok-free.app/todos');
//     res.send(`Your todo: ${JSON.stringify(response.data, null, 2)}`);
//   }
//   catch{
//     console.error("The error ocurred while trying to get todo");
//     res.status(500).json({message: 'Error with todo'});
//   }
// });

