# Swiss Proximity Atlas

A web application for visualizing proximity and accessibility across Switzerland, developed by LASUR & TRANSP-OR.

## Features

- **Supply Analysis**: Visualize proximity to various amenities and services based on OpenStreetMap data
- **Demand Analysis**: Explore mobility demand patterns across different transport modes
- **Interactive Maps**: MapLibre-based mapping with PMTiles for efficient data delivery
- **Multi-scale Visualization**: Support for both hexagonal (H3) and administrative polygon boundaries

## Technology Stack

- **Frontend**: Vue 3 + Vuetify + TypeScript
- **Mapping**: MapLibre GL JS with PMTiles
- **Data**: OpenStreetMap (OSM) for supply data
- **Geocoding**: OpenStreetMap Nominatim API
- **Deployment**: Cloudflare Pages

## Development Setup

### Prerequisites

- Node.js (v16 or higher)
- npm

### Installation

```bash
make install
```

Or manually:

```bash
npm run install:frontend
```

### Start Development Server

```bash
make dev
```

Or manually:

```bash
npm run dev
```

The development server will start on `http://localhost:3000`

## Code Quality

The project includes comprehensive linting and formatting tools:

### Linting

```bash
make lint          # Auto-fix linting issues
make lint-check    # Check for linting issues without fixing
```

### Type Checking

```bash
make type-check    # Run TypeScript type checking
```

### Testing

```bash
make test          # Run unit tests
```

### Preview Production Build

```bash
make preview       # Preview production build locally
```

### Pre-commit Hooks

The project uses lint-staged with git hooks to ensure code quality:

- ESLint runs on staged files before commit
- TypeScript compilation is checked
- Code formatting is automatically applied

## Deployment

The application is automatically deployed using Cloudflare Pages:

- **Development**: [atlas-swiss-proximity.pages.dev](https://atlas-swiss-proximity.pages.dev) (deployed from `dev` branch)
- **Production**: [proximity.situee.ch](https://proximity.situee.ch) (deployed from `main` branch)

## Data Processing

For information about data processing and tile generation, see `/data_processing/README.md`

## Project Structure

```
├── frontend/           # Vue.js frontend application
├── data_processing/    # Python scripts for data processing
├── functions/          # Cloudflare Functions (PMTiles serving)
├── documents/          # Project documentation
├── Makefile            # Root-level build commands
└── package.json        # Root package configuration
```
