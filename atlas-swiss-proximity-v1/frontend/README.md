# Swiss Proximity Atlas - Frontend

Vue.js frontend application for the Swiss Proximity Atlas.

## Technology Stack

- **Framework**: Vue 3 with Composition API
- **UI Library**: Vuetify 3
- **Language**: TypeScript
- **Mapping**: MapLibre GL JS
- **Data Format**: PMTiles
- **Build Tool**: Vite

## Development Setup

### Install dependencies

```bash
npm install
```

### Start development server

```bash
npm run dev
```

Runs the app in development mode on `http://localhost:3000`

### Build for production

```bash
npm run build
```

Builds the app for production to the `dist` folder.

### Type checking

```bash
npm run type-check
```

### Run unit tests

```bash
npm run test:unit
```

### Linting and Code Quality

```bash
npm run lint          # Auto-fix linting issues
npm run lint:check    # Check for linting issues without fixing
```

## Project Structure

```
src/
├── components/         # Vue components
├── views/              # Page-level components
├── utils/              # Utility functions and configurations
├── router/             # Vue Router configuration
├── styles/             # Global styles
└── assets/             # Static assets
```

## Key Features

- **Interactive Maps**: MapLibre-based maps with custom styling
- **Data Visualization**: Choropleth maps with configurable variables
- **Responsive Design**: Mobile-friendly interface
- **Real-time Updates**: Dynamic data filtering and visualization
