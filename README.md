# 🚀 SyncSpace — Real-Time Collaborative Workspace

SyncSpace is a state-of-the-art, real-time cooperative workspace dashboard where multiple users can collaborate concurrently on a shared interactive whiteboard, write and execute code together, manage shared sticky notes, and communicate via a live room chat.

🔗 **Live URL:** [https://sync-space-q1mx5tbzo-asim-05s-projects.vercel.app/](https://sync-space-q1mx5tbzo-asim-05s-projects.vercel.app/)

---

## ✨ Features

### 🎨 Collaborative Whiteboard
- Draw together in real-time with shape tools: **Freehand Pen, Rectangle, Circle, Arrow pointers, and Canvas Eraser**.
- **Figma-style Cursor Tracking:** Floating cursor dots with usernames show exactly where other collaborators are looking and drawing.
- Auto-adjusted canvas viewport grid layout with full session color sync.

### 💻 Live Code Editor
- Simultaneous conflict-free text editing powered by Monaco Editor, **Yjs (CRDT)**, and WebSockets.
- **Run Code:** Local sandboxed JS runtimes with custom virtual console stdout printing.
- **Save/Download:** Quick copy-to-clipboard or download source files actions.

### 📝 Cooperative Sticky Notes
- Shared notes grid with full CRUD capability (create, update title/content, deletion).
- Search filter interface to quickly find specific note cards.

### 💬 Room Chat & Timer
- Scrollable text chat sidebar with username timestamps.
- Sync-ready Meeting timer with run, pause, and reset actions.

---

## 🛠️ Tech Stack
- **Frontend:** React (Vite), Konva.js (Canvas), Monaco Editor (@monaco-editor/react), Socket.io-client, Yjs + y-websocket.
- **Backend:** Node.js, Express, Socket.io, y-websocket server.
- **Styling:** Custom dark-tint Navy layout with glassmorphic cards and smooth transition styles.

---

## 💻 Local Setup & Installation

Follow these steps to run the complete environment locally:

### 1. Clone the repository
```bash
git clone https://github.com/ASIM-05/SyncSpace.git
cd SyncSpace
```

### 2. Start the Backend Server (Express + Socket.io)
```bash
cd server
npm install
node index.js
```
*The server will run on `http://localhost:4000`.*

### 3. Start the Yjs websocket sync server
```bash
# From the project root
npx y-websocket
```
*The websocket proxy runs on port `1234` for editor CRDT sync.*

### 4. Start the Frontend Client
```bash
cd client
npm install
npm run dev
```
*Open `http://localhost:5173` in your browser. Open it in two different tabs to test multiplayer syncing!*

---

## ☁️ Production Deployment

- **Frontend:** Deployed on Vercel (Root Directory: `client`, Environment variable: `VITE_BACKEND_URL`).
- **Backend & Websockets:** Deployed on Render.
