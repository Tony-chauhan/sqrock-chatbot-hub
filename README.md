# Sqrock AI Chatbot Hub 🌌

An elegant, high-fidelity, and feature-rich conversational web application designed as the successful implementation of **Internship Task 1 (AI Chatbot Web Application)**. Built with a robust **Python Flask** server backend, lightweight **SQLite** persistence, and a premium **Vanilla CSS/JS** glassmorphic frontend UI.

Developed by **Dharmender Chauhan**, Intern at **Sqrock IT Solutions**.

---

## 🌟 Key Features

### 1. Robust Server Architecture
* **SQLite Persistence Layer:** Handles dynamic creation, deletion, and renaming of multiple chat threads (sessions) and persists complete message logs.
* **Flagship Google Gemini Integration:** Connects seamlessly to the frontier **`gemini-3.5-flash`** model with robust query retries and a resilient 30-second connection timeout.
* **OpenAI GPT Compatibility:** Built-in settings console to securely configure custom OpenAI API keys for actual completion completions.
* **offline Mock Engine:** Standard simulation layer out-of-the-box supporting four custom bot personalities (General Assistant, Coding Coach, Creative Storyteller, and Mindfulness Life Coach) with clever, context-rich mock replies.
* **Auto-Rename Trigger:** Intelligently summarizes and renames the session thread in the sidebar list based on the user's initial prompt.

### 2. High-End Visual Design & Aesthetics
* **Glassmorphic UI Elements:** High backdrop-filter blurs, thin semi-transparent card borders, elevated layered shadows, and responsive grid layouts.
* **Five Curated Visual Themes:** CSS custom properties let you hot-swap themes on the fly:
  * 🌌 **Cyberpunk Nebula:** Neon Magenta & Vibrant Cyan Accents (Default)
  * 🖤 **Classic Dark:** Clean Slate & Deep Charcoal
  * 🌟 **Midnight Aura:** Indigo & Bright Amber Gold
  * 🌇 **Sunset Glow:** Tangerine Coral & Deep Violet Gradient
  * 🌿 **Emerald Forest:** Rich Sage, Mint, & Soft Emerald Green
* **Pulsating Micro-Animations:** sequential typing dots indicator, bubble viewport slide-ups, active glow rings on microphone capture, and rotating control icons.
* **CSS Avatars:** Vectorized circular gradient shapes that render instantly without slow media files.

### 3. Voice Hub & Markdown Rendering
* **Speech-to-Text (STT) Input:** Fully integrates browser speech recognition. Tap the microphone in the console to speak; it automatically parses and submits your prompt.
* **Text-to-Speech (TTS) Narration:** Narrates chatbot responses using natural voice synthesis. Intelligently filters out coding blocks and markdown markers for a fluid audio output.
* **Markdown Parser:** Translates headers, bulleted lists, bold text, and code syntaxes into elegant HTML structures on the client. Includes an instant "Copy Code" button on every code window.

---

## ⚙️ Installation & Running Instructions

### 1. Install Dependencies
Ensure you have Python 3 installed. Run the package installer:
```bash
pip install -r requirements.txt
```

### 2. Run the Development Server
Execute the Flask server:
```bash
python app.py
```

### 3. Open the Dashboard
Navigate to your local port in your web browser:
👉 **[http://127.0.0.1:5000](http://127.0.0.1:5000)**

---

## 👨‍💻 Intern Information
* **Developer Name:** Dharmender Chauhan
* **Internship Track:** Python & Data Science Intern
* **Organization:** Sqrock IT Solutions
* **Submission Date:** May 2026
