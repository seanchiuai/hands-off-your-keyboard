# AI Voice Shopping Assistant 🛍️🎤

A sophisticated AI-powered shopping assistant that uses voice conversations to help users find products, learn their preferences, and provide personalized recommendations.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Python](https://img.shields.io/badge/Python-3.8+-green)

## 🌟 Overview

This project combines cutting-edge voice AI technology with intelligent product search and preference learning to create a natural, conversational shopping experience. Users can speak naturally about what they're looking for, and the AI assistant understands context, asks clarifying questions, and learns their preferences over time.

### Key Features

- 🎙️ **Real-time Voice Conversations**: Natural language shopping through voice using Pipecat and Gemini
- 🔍 **Background Research Agent**: Autonomous product search across multiple retailers
- 🧠 **Intelligent Preference Learning**: AI-powered system that learns user preferences from interactions
- 💾 **Personal Shopping Lists**: Save items across sessions with full history
- 🎨 **Modern Interactive UI**: Beautiful, responsive interface with product carousels and detailed cards
- 🔐 **Secure Authentication**: Clerk-based user authentication and session management

## 🏗️ Architecture

### Technology Stack

**Frontend:**
- Next.js 15 (App Router)
- React 19
- TypeScript
- Tailwind CSS 4
- shadcn/ui components

**Backend:**
- Convex (real-time database & serverless functions)
- Clerk (authentication)
- Gemini 2.0 Flash (preference learning & analysis)

**Voice Agent:**
- Pipecat AI (voice pipeline framework)
- Gemini 1.5 Flash (conversational AI)
- Google TTS (text-to-speech)
- Silero VAD (voice activity detection)
- WebSocket (real-time communication)

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Next.js Frontend                      │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Voice UI    │  │ Research Page │  │ Product Display  │  │
│  │ (WebSocket) │  │              │  │ (Carousels)      │  │
│  └──────┬──────┘  └──────┬───────┘  └────────┬─────────┘  │
└─────────┼────────────────┼───────────────────┼─────────────┘
          │                │                   │
          │ WebSocket      │ Convex Hooks      │
          │                │                   │
┌─────────▼────────────────▼───────────────────▼─────────────┐
│                      Convex Backend                         │
│  ┌────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │ Voice      │  │ Research     │  │ Preference        │  │
│  │ Sessions   │  │ Actions      │  │ Learning (Gemini) │  │
│  │ (HTTP API) │  │              │  │                   │  │
│  └─────┬──────┘  └──────────────┘  └───────────────────┘  │
└────────┼───────────────────────────────────────────────────┘
         │ HTTP Callbacks
         │
┌────────▼─────────────────────────────────────────────────┐
│              Pipecat Voice Agent (Python)                 │
│  ┌──────┐  ┌──────┐  ┌─────────┐  ┌─────┐  ┌─────────┐ │
│  │ VAD  │→ │ STT  │→ │ Gemini  │→ │ TTS │→ │ WebRTC  │ │
│  │      │  │      │  │ LLM     │  │     │  │ /WS     │ │
│  └──────┘  └──────┘  └────┬────┘  └─────┘  └─────────┘ │
│                           │                              │
│                    ┌──────▼──────┐                       │
│                    │ Custom      │                       │
│                    │ Actions     │                       │
│                    │ (Search,    │                       │
│                    │  Save)      │                       │
│                    └─────────────┘                       │
└──────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Python 3.8+
- Accounts for: [Convex](https://convex.dev), [Clerk](https://clerk.com), [Google AI](https://ai.google.dev/)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/hands-off-your-keyboard.git
cd hands-off-your-keyboard
```

2. **Install dependencies**
```bash
# Frontend & Backend
npm install

# Voice Agent
cd pipecat
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cd ..
```

3. **Set up Convex**
   ```bash
   npx convex dev
# This will create .env.local with your NEXT_PUBLIC_CONVEX_URL
```

4. **Configure Clerk**
- Create an application at [clerk.com](https://clerk.com)
- Create a JWT template named "convex" (select Convex preset)
- Add to `.env.local`:
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

5. **Configure Gemini API**
- Get API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
- Add to Convex Dashboard → Settings → Environment Variables:
```
GOOGLE_GENERATIVE_AI_API_KEY=your_key_here
PIPECAT_SERVER_SECRET=your_secret_here
```
- Add to `pipecat/.env`:
```env
GOOGLE_API_KEY=your_key_here
CONVEX_HTTP_URL=your_convex_url
PIPECAT_SERVER_SECRET=same_secret_as_above
```

6. **Update Convex Auth Config**
Edit `convex/auth.config.ts`:
```typescript
export default {
  providers: [
    {
      domain: "https://your-app.clerk.accounts.dev",
      applicationID: "convex",
    },
  ]
};
```

See [SETUP.md](./SETUP.md) for detailed setup instructions.

## 🎯 Usage

### Running the Application

**Terminal 1 - Backend & Frontend:**
```bash
npm run dev
```

**Terminal 2 - Voice Agent:**
```bash
cd pipecat
source venv/bin/activate
python agent.py
```

The application will be available at:
- Frontend: http://localhost:3000
- Voice Agent: ws://localhost:8000
- Convex Dashboard: Opens automatically

### Using the Voice Shopping Assistant

1. **Navigate to Voice Shopper** at http://localhost:3000/voice-shopper
2. **Click the microphone button** to start a voice session
3. **Speak naturally** about what you're looking for:
   - "I need a laptop for programming under $1500"
   - "Show me ergonomic office chairs"
   - "Find me affordable wireless headphones"
4. **The AI will ask clarifying questions** if needed
5. **View products** in the results panel
6. **Save items** to your personal list

### Using Background Research

1. **Navigate to Research** at http://localhost:3000/research
2. **Enter a search query** with optional filters
3. **The system searches in the background** and continuously updates results
4. **View and filter products** by price, rating, retailer

## 🧠 How It Works

### Voice Conversation Flow

1. **User speaks** → Audio captured via browser
2. **Pipecat VAD** detects voice activity
3. **Speech-to-Text** converts audio to text
4. **Gemini LLM** processes the query and generates response
5. **Custom Actions** trigger (search products, save items)
6. **Text-to-Speech** converts response to audio
7. **User hears response** via browser audio output

### Preference Learning System

The system learns user preferences through two mechanisms:

**1. Explicit Interactions:**
- Tracking saves, views, clicks, purchases
- Recording voice queries and search terms
- Monitoring product categories and price ranges

**2. AI-Powered Analysis:**
- Gemini analyzes interaction patterns
- Extracts structured preferences (style, budget, brands, colors)
- Updates user profile automatically
- Personalizes future recommendations

Example: If you consistently view modern, minimalist furniture under $500, the system learns your style and budget preferences automatically.

### Background Research Agent

When you search for products:

1. **Query Analysis**: System parses your search and preferences
2. **Multi-Source Search**: Searches across configured retailers (extensible to real APIs)
3. **Result Storage**: Products stored in database with rankings
4. **Continuous Updates**: Results can be updated asynchronously
5. **Personalized Ranking**: Results ranked based on your learned preferences

## 📁 Project Structure

```
hands-off-your-keyboard/
├── app/                          # Next.js app router pages
│   ├── voice-shopper/           # Voice shopping interface
│   ├── research/                # Background research page
│   └── tasks/                   # Task management demo
├── components/                   # React components
│   ├── ui/                      # shadcn/ui components
│   ├── ProductCard.tsx          # Product display card
│   ├── ProductCarousel.tsx      # Product grid/carousel
│   ├── VoiceInputButton.tsx     # Voice control button
│   └── VoiceAgentDisplay.tsx    # Conversation display
├── convex/                       # Backend functions
│   ├── schema.ts                # Database schema
│   ├── voiceShopper.ts          # Voice session management
│   ├── research.ts              # Background research logic
│   ├── preferenceLearning.ts    # AI preference extraction
│   ├── userPreferences.ts       # Preference CRUD
│   ├── http.ts                  # HTTP endpoints for Pipecat
│   └── auth.config.ts           # Clerk configuration
├── pipecat/                      # Python voice agent
│   ├── agent.py                 # Main Pipecat agent
│   ├── actions.py               # Custom LLM actions
│   ├── prompts.py               # System prompts
│   └── requirements.txt         # Python dependencies
├── SETUP.md                      # Detailed setup guide
├── DEPLOYMENT.md                 # Deployment instructions
└── TOOL_FEEDBACK.md              # Feedback on Pipecat & Gemini
```

## 🎨 Features in Detail

### Voice Shopping Interface
- Real-time voice conversation with visual feedback
- Agent status indicators (listening, thinking, speaking)
- Conversation history with timestamps
- Product results displayed as you speak
- Save items directly from voice commands

### Product Display
- Rich product cards with images, prices, ratings
- Interactive elements (wishlist, cart, external links)
- Responsive grid layout
- Real-time availability status
- Source attribution for multi-retailer support

### Preference Management
- Automatic preference learning from behavior
- Manual preference editing
- Style, budget, size, brand, color tracking
- Confidence scoring for learned preferences
- Privacy-focused (user data isolated)

### Session Management
- Secure authentication via Clerk
- Per-user session history
- Saved items persist across sessions
- Conversation logs for continuity

## 🔧 Configuration

### Environment Variables

**`.env.local` (Frontend & Convex):**
```env
NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

**Convex Dashboard Environment Variables:**
```env
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_key
PIPECAT_SERVER_SECRET=your_shared_secret
CLERK_JWT_ISSUER_DOMAIN=https://your-app.clerk.accounts.dev
```

**`pipecat/.env` (Voice Agent):**
```env
GOOGLE_API_KEY=your_gemini_key
CONVEX_HTTP_URL=https://your-project.convex.cloud
PIPECAT_SERVER_SECRET=same_as_convex_secret
SERVER_HOST=0.0.0.0
SERVER_PORT=8000
```

See [SETUP.md](./SETUP.md) for complete configuration details.

## 🚀 Deployment

### Frontend (Vercel)
```bash
# Connect GitHub repo to Vercel
# Add environment variables in Vercel dashboard
# Deploy automatically on push
```

### Backend (Convex)
```bash
# Convex auto-deploys on push to main
# Or manually: npx convex deploy --prod
```

### Voice Agent (Your Server)
```bash
# Use systemd, PM2, or Docker
# Ensure persistent connection to Convex
# Configure SSL/TLS for production WebSocket
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

## 🧪 Development

### Running Tests
```bash
npm run lint                    # Lint frontend code
npm run build                   # Test production build
```

### Development Workflow
1. Start Convex dev server: `npx convex dev`
2. Start Next.js: `npm run dev:frontend`
3. Start Pipecat agent: `cd pipecat && python agent.py`
4. Make changes and see live updates

### Adding Product Search APIs

Currently uses mock data for demonstration. To integrate real product APIs:

1. **Edit `convex/research.ts`:**
   - Uncomment the example API integration code (lines 109-136)
   - Add your API keys to Convex environment variables
   - Implement rate limiting and error handling

2. **Supported APIs:**
   - Google Gemini API with Search grounding (currently implemented)
   - Google Shopping API
   - Amazon Product Advertising API
   - Custom retailer APIs

## 📚 Documentation

- [Setup Guide](./SETUP.md) - Detailed setup instructions
- [Deployment Guide](./DEPLOYMENT.md) - Production deployment
- [Tool Feedback](./TOOL_FEEDBACK.md) - Experiences with Pipecat & Gemini
- [Convex Guidelines](./convexGuidelines.md) - Backend development patterns
- [Pipecat README](./pipecat/README.md) - Voice agent details

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 🙏 Acknowledgments

- **Pipecat AI** for the excellent voice pipeline framework
- **Google Gemini** for powerful LLM capabilities
- **Convex** for the real-time backend infrastructure
- **Clerk** for seamless authentication
- **Vercel** for Next.js and deployment platform

## 🐛 Known Limitations

- Product search uses mock data (integrate real APIs for production)
- WebSocket reconnection needs enhancement for production reliability
- Voice agent supports single concurrent session (scale with multiple instances)
- Limited to English language (multilingual support possible)

## 🗺️ Roadmap

- [ ] Integrate real product search APIs
- [ ] Add voice transcription display
- [ ] Implement multi-retailer price comparison
- [ ] Add product availability notifications
- [ ] Support multiple concurrent voice sessions
- [ ] Mobile app with React Native
- [ ] Multi-language support
- [ ] Advanced preference analytics dashboard

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/hands-off-your-keyboard/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/hands-off-your-keyboard/discussions)
- **Documentation**: See docs in the repository

---

**Built with ❤️ for the future of conversational commerce**
