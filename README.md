# Phaser Platformer Game

A 2D platformer game made with Phaser.js.

## Setup and Development

### Prerequisites
- Node.js (v14 or later)
- npm

### Installation
1. Clone this repository
2. Install the dependencies:
   ```
   npm install
   ```

### Development
To run the development server:
```
npm start
```
Or using the webpack dev server:
```
npm run dev
```

## Building for Production
To create a bundled version of the game:
```
npm run build
```

This will create a `dist` directory with the following files:
- `index.html`: The HTML file
- `bundle.js`: The bundled JavaScript file
- `assets/`: Directory containing all assets

## Running the Production Build
To run the production build, you can serve the `dist` directory:
```
npx http-server ./dist -p 8080
```

## Cleaning Up
To remove the `dist` directory:
```
npm run clean
```

## Game Controls
- Left/Right arrows or on-screen buttons: Move left/right
- Space or up arrow or on-screen button: Jump

Enjoy the game! 