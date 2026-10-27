# PAA (Personal Agentic Assistant)

PAA is a voice-first personal assistant mobile app designed to live on your phone. It listens for wake phrases, captures spoken thoughts, saves tasks, sets exact alarms that ring even when the app is closed, and provides an end-of-day brief.

---

## Architecture Overview

- **App:** React Native (Expo Development Build, TypeScript strict mode)
- **Backend:** Next.js API proxy (`/api/transcribe`, `/api/chat`) protecting your API keys
- **STT:** Groq Whisper (`whisper-large-v3-turbo`)
- **LLM:** Tool calling with Groq (`llama-3.3-70b-versatile` / gpt-oss)
- **Local DB:** SQLite (`expo-sqlite`) on-device
- **Wake Word:** Picovoice Porcupine (custom keywords: "Hey PAA", "Hi PAA")
- **Alarms:** Exact local alarms on Android and notifications on iOS

---

## Milestone 1: Audio Recording & STT Pipeline

### What works in Milestone 1:
1. **Next.js Backend API:**
   - `POST /api/transcribe`: Receives `.m4a` / audio FormData, verifies shared secret header (`x-paa-secret-key`), enforces rate limiting (30 reqs/min) and file size checks (max 25MB).
   - If `GROQ_API_KEY` is present in `backend/.env.local`, transcribes using Groq Whisper `whisper-large-v3-turbo`.
   - If `GROQ_API_KEY` is not yet configured, returns a fallback mock transcription so you can test the entire pipeline immediately without waiting for keys!
   - `GET /api/health`: Health status and Groq configuration check.
2. **Expo Mobile App:**
   - **Voice recording with VAD:** Uses `expo-av` with live metering.
   - **Silence Detection (VAD):** Automatically detects silence and stops recording after **1.5 seconds** of quiet (or hard-stops at **30 seconds**).
   - **Tap-to-talk button:** User can also tap the button to stop talking at any time.
   - **Clear UI States:** Visual transitions between `idle`, `listening`, `thinking`, `done`, and `error`.
   - **Live Sound Visualizer:** Animated soundwave bars responding to your voice volume in real-time.
   - **Silence countdown display:** Shows elapsed silence time as you speak.
   - **Graceful Error Handling:** Network errors, mic permission denials, and timeouts are caught and displayed clearly with retry buttons (never crashes).
   - **Settings Cog:** Easily adjust the backend server URL (e.g. `http://localhost:3000`, `http://10.0.2.2:3000`, or your local LAN IP) right from the mobile UI.

---

## Setup & Running Milestone 1

### 1. Backend Setup

```bash
cd backend

# Install dependencies (already installed)
npm install

# (Optional) Add your Groq API key to .env.local
# If omitted, the backend will return mock transcriptions for testing
cp .env.example .env.local

# Start the backend server
npm run dev
```

The backend runs at `http://localhost:3000` (and shows your local LAN IP in terminal output).

---

### 2. Mobile App Setup

In another terminal window:

```bash
cd mobile

# Start the Expo development server
npx expo start
```

#### Running on Devices:

- **iOS Simulator:** Press `i` in the Expo terminal (connects to `http://localhost:3000`).
- **Android Emulator:** Press `a` in the Expo terminal (connects to `http://10.0.2.2:3000`).
- **Physical Phone (Expo Go or Dev Client):**
  1. Scan the QR code with Expo Go or install a dev build.
  2. Tap **⚙️ Settings** in the top right of the PAA app.
  3. Enter your computer's local Wi-Fi IP (e.g. `http://192.168.1.X:3000`).
  4. Tap **Save**.

---

## Testing Milestone 1 Step-by-Step

1. **Verify Backend Health:**
   ```bash
   curl http://localhost:3000/api/health
   ```
   Should return `{"status":"ok","service":"PAA Backend Proxy",...}`.

2. **Open the Mobile App:**
   - You will see the **PAA** interface in `IDLE` state with a blue mic button.
3. **Record Voice:**
   - Tap the **🎙 Tap to Speak** button.
   - The state switches to `LISTENING` and the button turns red.
   - Speak into your microphone: *"Today I will be working on the PDF, the landing page, and the API fix."*
   - Notice the animated audio wave bars bouncing in response to your voice.
4. **Test Silence Detection (VAD):**
   - Stop talking.
   - Watch the indicator count silence: *"Silence detected (1.5s / 1.5s)..."*
   - The app will automatically stop recording without needing to touch the screen!
   - (Or tap the red button to finish immediately).
5. **Inspect the Result:**
   - The state transitions to `THINKING` (amber spinner) while the audio uploads to `/api/transcribe`.
   - The state transitions to `DONE` (green badge) and renders the transcript card with the transcribed text!
   - Tap **Speak Again** to start a new voice session.

---

## Environment Variables Reference

### Backend (`backend/.env.local`)

| Variable | Description | Default |
| :--- | :--- | :--- |
| `GROQ_API_KEY` | Your Groq Cloud API key | `""` (runs in mock mode if blank) |
| `PAA_SHARED_SECRET` | Secret header key between app & backend | `paa-dev-secret` |
| `PORT` | Local dev server port | `3000` |

---

## What's Next: Milestone 2 (Brain)
- Connect gpt-oss via Groq with tool calling (`add_task`, `set_reminder`, `complete_task`, `list_tasks`, `get_day_summary`).
- Initialize SQLite with `expo-sqlite` and migration setup.
- Save tasks directly to local database when spoken or typed, and render the live task list.
