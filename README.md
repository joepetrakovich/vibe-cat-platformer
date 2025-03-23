# Cat Platformer Race Game

A multiplayer 2D platformer racing game made with Phaser.js and Croquet for real-time multiplayer functionality.

## Description

This is a simple platformer game where you control a cat character and race against other players to reach the food at the top of the level. The first player to reach the goal wins!

## Features

- Responsive game that works on mobile and desktop
- Cute cat character with different animations (idle, walk, jump)
- Simple, intuitive controls
- Real-time multiplayer using Croquet
- Automatic session management and player tracking
- Automatic game reset after a player wins

## How to Play

1. Use arrow keys or on-screen buttons to control your cat:
   - Left/Right: Move horizontally
   - Up: Jump

2. Race to reach the food (goal) at the top of the level. The first player to reach it wins the round!

## Multiplayer

The game now features multiplayer functionality using Croquet JS. When players join, each player gets their own cat to control. The game automatically:

- Assigns a unique player number to each player
- Shows all connected players in real-time
- Declares a winner when a player reaches the goal
- Resets the game after a short delay
- Keeps track of scores across rounds

## Getting Started

### Prerequisites

- Node.js and npm installed

### Installation

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```

3. Set up Croquet API key:
   - Get a free API key from https://croquet.io/keys
   - Create or modify the `.env` file in the root directory:
     ```
     CROQUET_API_KEY=your_api_key_here
     ```

### Running the Game

To run the development server:
```
npm run dev
```

Then open your browser to:
- Single player: http://localhost:8080/
- Multiplayer: http://localhost:8080/multiplayer.html

### Sharing the Game

To play with friends:
1. Launch the multiplayer version
2. Copy the URL (a button is provided in the game interface)
3. Share the URL with friends
4. When they open the URL, they'll join your session automatically

## How It Works

The multiplayer functionality is implemented using Croquet, which provides:
- Shared, synchronized state across all players
- Automatic networking without requiring server setup
- Easy to use pub/sub model for game events

The game maintains a shared model (GameModel) that stores:
- All player positions and states
- Game state (who won, game over status)
- Score tracking

Each player has a view (GameView) that:
- Handles local input
- Updates the shared model
- Renders other players based on the shared state

## Development

### Project Structure

- `game.js` - Original single-player game
- `multiplayer-game.js` - Multiplayer version of the game
- `CroquetModels.js` - Croquet model classes for shared state
- `Character.js` - Character class for player control
- `CharacterStateMachine.js` - State machine for character animations
- `World.js` - Game world with platforms
- `.env` - Environment variables including Croquet API key

### Building

To build the production version:
```
npm run build
```

## License

This project is licensed under the MIT License.

## Acknowledgments

- [Phaser.js](https://phaser.io/) - Game framework
- [Croquet](https://croquet.io/) - Multiplayer framework 