# TOABH React Dashboard

A modern, mobile-friendly React-based dashboard for the TOABH project, built with Vite, React, TypeScript, and Tailwind CSS.

## Features

- **Prompt Management** - Create, edit, and organize image generation prompts
- **Reference Sets** - Upload and manage reference images for consistent generation
- **Image Generation** - Batch generate images using Flux/Gemini models
- **Results Gallery** - Browse, filter, and download generated images
- **Prompt Generator** - AI-powered prompt generation from reference images
- **Mobile Responsive** - Fully responsive design with collapsible sidebar

## Tech Stack

- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite 8
- **Styling**: Tailwind CSS 4
- **Routing**: React Router DOM v7
- **Icons**: Lucide React
- **Utilities**: clsx, tailwind-merge

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

The development server will start at `http://localhost:5173`

## Project Structure

```
src/
├── components/
│   ├── layout/           # Layout components (Sidebar, Header, MainLayout)
│   └── ui/               # UI components (Button, Card, Input)
├── pages/                # Page components
│   ├── prompts/          # Prompt management & generator
│   ├── reference/        # Reference image management
│   ├── generate/         # Image generation interface
│   ├── gallery/          # Results gallery
│   └── settings/         # Settings page
├── hooks/                # Custom React hooks
├── types/                # TypeScript type definitions
├── utils/                # Utility functions
├── App.tsx               # Main app component
└── index.css             # Global styles
```

## API Integration

This dashboard is designed to work with the Flask backend API at `../new_dashboard/app.py`.

Key API endpoints to integrate:
- `GET/POST /api/prompts` - Prompt CRUD operations
- `GET/POST /api/reference-images` - Reference image management
- `POST /api/generate` - Image generation
- `GET /api/generated-images` - Fetch generated images
- `POST /api/prompt-generator/generate` - AI prompt generation

## Mobile Design

The dashboard features:
- Collapsible sidebar with swipe gesture support (mobile)
- Responsive grid layouts
- Touch-friendly UI elements
- Mobile-optimized navigation

## Tailwind CSS v4

This project uses Tailwind CSS v4 with the new CSS-first configuration approach. Styles are defined in `src/index.css` using the `@theme` directive.

## Inspiration from react-bits

Components and animations are inspired by [react-bits](https://github.com/DavidHDev/react-bits), a collection of animated React components.

## License

MIT
