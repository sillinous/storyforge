# Story Forge 📖✨

A professional comic book script writing application with AI-powered generation, hierarchical narrative structure, and real-time collaboration.

## Features

- **Hierarchical Narrative System**: Series → Book → Chapter → Beat → Page → Panel
- **AI-Powered Generation**: Generate story structure, beats, pages, and panel scripts using Claude or OpenAI
- **Atomic Element Tracking**: Full control over every element at every level
- **Real-time Collaboration**: Multi-user editing with role-based permissions
- **Script Export**: Export in industry-standard script format or JSON
- **Resizable Interface**: Customizable detail panel width (400-1200px)

## Tech Stack

- **Frontend**: React 18 + Vite
- **Styling**: Custom CSS with CSS variables
- **Backend**: Firebase (Auth, Firestore)
- **AI**: Anthropic Claude / OpenAI API

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a Firebase project and update `src/firebase.js` with your config
4. Run development server:
   ```bash
   npm run dev
   ```
5. Build for production:
   ```bash
   npm run build
   ```

## Project Structure

```
src/
├── App.jsx              # Main application component
├── firebase.js          # Firebase configuration
├── generationService.js # AI generation logic
├── index.css            # Global styles
├── main.jsx             # Entry point
└── seedData.js          # Sample data

docs/
├── ATOMIC_GENERATION.md
├── COLLABORATION_SYSTEM.md
├── CONTEXT_FLOW.md
├── DEEP_CONTEXT_SYSTEM.md
├── FIREBASE_RULES.md
└── STRUCTURE_VERIFICATION.md
```

## Version History

See [CHANGELOG.md](CHANGELOG.md) for detailed version history.

**Current Version**: 3.7.8

## License

MIT
