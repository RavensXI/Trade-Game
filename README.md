# Geography Trading Game

A fun educational game about international trade! Test your knowledge of global trade relationships by guessing which countries trade more with each other.

## 🎮 Play Now

You can play the game in two ways:

1. Visit the GitHub Pages version (once you set it up)
2. Run it locally (instructions below)

## 🚀 How to Play

1. Each round shows a country and its trading partners
2. Choose which country receives more exports from the current country
3. Build a chain of correct guesses to increase your score
4. After 3 correct guesses, you can close the loop by selecting your starting country
5. Successfully closing a loop gives bonus points!

## 🛠️ Local Setup

1. Clone this repository:
```bash
git clone https://github.com/RavensXI/Trade-Game.git
cd Trade-Game
```

2. Start a local server:
- Using Python 3:
  ```bash
  python -m http.server 8000
  ```
- Using Python 2:
  ```bash
  python -m SimpleHTTPServer 8000
  ```
- Using Node.js:
  ```bash
  npx http-server
  ```

3. Open your browser and visit:
```
http://localhost:8000
```

## 🌟 Features

- Interactive world map with trade routes
- Real trade data between countries
- Dynamic scoring system
- Trade route animations
- Country flags
- Victory screen with high scores

## 📁 Project Structure

```
Trade-Game/
├── assets/
│   └── styles/
│       ├── main.css
│       └── map.css
├── src/
│   ├── core/
│   │   └── Game.js
│   ├── components/
│   │   └── Map.js
│   ├── data/
│   │   └── countries.json
│   ├── config.js
│   └── main.js
└── index.html
```

## 🤝 Contributing

Feel free to contribute to this project! You can:
1. Report bugs
2. Suggest new features
3. Submit pull requests

## 📜 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Trade data sourced from various international trade databases
- Flags provided by [flagcdn.com](https://flagcdn.com)
- Map functionality powered by [Leaflet](https://leafletjs.com/) 