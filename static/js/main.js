/**
 * Sqrock AI Chatbot Hub
 * Core Frontend Application Script
 */

document.addEventListener('DOMContentLoaded', () => {
    
    // ==========================================================================
    // GLOBAL STATE
    // ==========================================================================
    const state = {
        activeSessionId: null,
        settings: {},
        isListening: false,
        isTTSActive: false,
        recognition: null,
        voices: []
    };

    // ==========================================================================
    // DOM ELEMENTS SELECTORS
    // ==========================================================================
    const DOM = {
        // App Layout Containers
        sidebar: document.getElementById('sidebar'),
        sidebarOpenBtn: document.getElementById('sidebar-open-btn'),
        sidebarCloseBtn: document.getElementById('sidebar-close-btn'),
        chatViewport: document.getElementById('chat-viewport'),
        welcomeScreen: document.getElementById('welcome-screen'),
        messagesStream: document.getElementById('messages-stream'),
        sessionsList: document.getElementById('sessions-list'),
        activeSessionTitle: document.getElementById('active-session-title'),
        
        // Header Controls
        personaBadgeContainer: document.getElementById('persona-badge-container'),
        activePersonaDisplay: document.getElementById('active-persona-display'),
        engineBadge: document.getElementById('engine-badge'),
        engineNameLabel: document.getElementById('engine-name-label'),
        ttsBtn: document.getElementById('tts-narration-btn'),
        quickThemeBtn: document.getElementById('quick-theme-btn'),
        
        // Message Input
        chatInputForm: document.getElementById('chat-input-form'),
        userInputTextbox: document.getElementById('user-input-textbox'),
        sendMsgBtn: document.getElementById('send-message-btn'),
        voiceInputBtn: document.getElementById('voice-input-btn'),
        pulseMicRing: document.querySelector('.pulse-mic-ring'),
        
        // Buttons
        newChatBtn: document.getElementById('new-chat-btn'),
        settingsTriggerBtn: document.getElementById('settings-trigger-btn'),
        sidebarProfileTrigger: document.getElementById('sidebar-profile-trigger'),
        
        // Settings Modal Controls
        settingsModal: document.getElementById('settings-modal'),
        settingsCloseBtn: document.getElementById('settings-close-btn'),
        settingsCancelBtn: document.getElementById('settings-cancel-btn'),
        settingsSaveBtn: document.getElementById('settings-save-btn'),
        modalTabBtns: document.querySelectorAll('.modal-tab-btn'),
        tabPanes: document.querySelectorAll('.tab-pane'),
        
        // Modal Form Controls
        inputUserName: document.getElementById('input-user-name'),
        selectTheme: document.getElementById('select-theme'),
        selectPersona: document.getElementById('select-persona'),
        selectProvider: document.getElementById('select-provider'),
        inputOpenaiKey: document.getElementById('input-openai-key'),
        inputGeminiKey: document.getElementById('input-gemini-key'),
        avatarOptions: document.querySelectorAll('.avatar-option'),
        
        // Main Screen Interactions
        personaCards: document.querySelectorAll('.persona-card'),
        suggestionPills: document.querySelectorAll('.suggestion-pill'),
        sidebarUserName: document.getElementById('sidebar-user-name'),
        sidebarUserAvatar: document.getElementById('sidebar-user-avatar')
    };

    // ==========================================================================
    // INITIALIZATION & SETTINGS MANAGER
    // ==========================================================================
    async function initApp() {
        await loadSettings();
        await loadSessions();
        initSpeechRecognition();
        initSpeechSynthesis();
        setupEventListeners();
        
        // Highlight active avatar in settings modal
        const currentAvatar = state.settings.user_avatar || 'user-avatar-1';
        DOM.avatarOptions.forEach(opt => {
            if (opt.getAttribute('data-avatar') === currentAvatar) {
                opt.classList.add('selected');
            } else {
                opt.classList.remove('selected');
            }
        });
    }

    async function loadSettings() {
        try {
            const res = await fetch('/api/settings');
            const data = await res.json();
            state.settings = data;
            
            // Apply preferences to UI
            applyTheme(data.current_theme);
            applyUserSettings(data.user_name, data.user_avatar);
            applyActivePersonaBadge(data.active_persona);
            applyEngineBadge(data.active_provider);
            
            // Sync settings form controls
            DOM.inputUserName.value = data.user_name;
            DOM.selectTheme.value = data.current_theme;
            DOM.selectPersona.value = data.active_persona;
            DOM.selectProvider.value = data.active_provider;
            DOM.inputOpenaiKey.value = data.openai_api_key || '';
            DOM.inputGeminiKey.value = data.gemini_api_key || '';
            
            // Sync TTS settings
            state.isTTSActive = data.speech_output_enabled === 'true';
            toggleTTSUI();
            
            toggleProviderFields(data.active_provider);
        } catch (err) {
            console.error('Failed to load settings:', err);
        }
    }

    function applyTheme(themeClass) {
        document.body.className = ''; // Reset
        document.body.classList.add(`theme-${themeClass}`);
    }

    function applyUserSettings(name, avatarClass) {
        DOM.sidebarUserName.textContent = name;
        DOM.sidebarUserAvatar.className = 'avatar ' + (avatarClass || 'user-avatar-1');
    }

    function applyActivePersonaBadge(personaKey) {
        const personasMap = {
            'assistant': 'General Assistant',
            'coder': 'Coding Coach',
            'creative': 'Storyteller',
            'lifecoach': 'Life Coach'
        };
        DOM.activePersonaDisplay.textContent = personasMap[personaKey] || 'Assistant';
        
        // Update welcoming screen cards highlighting if needed
        DOM.personaCards.forEach(card => {
            if (card.getAttribute('data-persona') === personaKey) {
                card.style.borderColor = 'var(--border-hover)';
                card.style.background = 'rgba(255, 255, 255, 0.05)';
            } else {
                card.style.borderColor = '';
                card.style.background = '';
            }
        });
    }

    function applyEngineBadge(providerKey) {
        const enginesMap = {
            'mock': 'Offline Simulation',
            'openai': 'OpenAI GPT-4o-mini',
            'gemini': 'Google Gemini API'
        };
        DOM.engineNameLabel.textContent = enginesMap[providerKey] || 'Offline Simulation';
        
        if (providerKey === 'mock') {
            DOM.engineBadge.querySelector('.engine-indicator-dot').style.background = 'var(--accent-secondary)';
            DOM.engineBadge.querySelector('.engine-indicator-dot').style.boxShadow = '0 0 6px var(--accent-secondary)';
        } else {
            DOM.engineBadge.querySelector('.engine-indicator-dot').style.background = '#22c55e';
            DOM.engineBadge.querySelector('.engine-indicator-dot').style.boxShadow = '0 0 6px #22c55e';
        }
    }

    // Toggle specific provider API settings textboxes in settings pane
    function toggleProviderFields(provider) {
        document.getElementById('fields-openai').style.display = provider === 'openai' ? 'block' : 'none';
        document.getElementById('fields-gemini').style.display = provider === 'gemini' ? 'block' : 'none';
    }

    // ==========================================================================
    // CHAT SESSION/THREADS HISTORY COMPONENT
    // ==========================================================================
    async function loadSessions() {
        try {
            const res = await fetch('/api/sessions');
            const sessions = await res.json();
            
            DOM.sessionsList.innerHTML = '';
            
            if (sessions.length === 0) {
                DOM.sessionsList.innerHTML = '<div class="sessions-placeholder">No active sessions. Start a conversation below!</div>';
                showWelcomeScreen();
                return;
            }
            
            sessions.forEach(session => {
                const item = document.createElement('div');
                item.className = `session-item ${session.id === state.activeSessionId ? 'active' : ''}`;
                item.setAttribute('data-id', session.id);
                
                item.innerHTML = `
                    <div class="session-info">
                        <svg class="session-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                        <div class="session-name-wrapper">
                            <span class="session-name">${escapeHTML(session.name)}</span>
                        </div>
                    </div>
                    <div class="session-controls">
                        <button class="session-control-btn edit-name" title="Rename Session">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z"/></svg>
                        </button>
                        <button class="session-control-btn delete" title="Delete Session">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                        </button>
                    </div>
                `;
                
                // Switch session handler
                item.addEventListener('click', (e) => {
                    // Prevent switching if clicking inside controls
                    if (e.target.closest('.session-controls')) return;
                    selectSession(session.id, session.name);
                });
                
                // Rename button trigger
                item.querySelector('.edit-name').addEventListener('click', (e) => {
                    e.stopPropagation();
                    enableRenameSession(item, session.id, session.name);
                });

                // Delete button trigger
                item.querySelector('.delete').addEventListener('click', async (e) => {
                    e.stopPropagation();
                    if (confirm('Delete this chat history permanently?')) {
                        await deleteSession(session.id);
                    }
                });

                DOM.sessionsList.appendChild(item);
            });
            
            // If there's an active session, ensure it has the active class
            if (state.activeSessionId) {
                const activeItem = DOM.sessionsList.querySelector(`[data-id="${state.activeSessionId}"]`);
                if (activeItem) activeItem.classList.add('active');
            }
        } catch (err) {
            console.error('Failed to load sessions:', err);
        }
    }

    async function selectSession(sessionId, sessionName) {
        state.activeSessionId = sessionId;
        DOM.activeSessionTitle.textContent = sessionName;
        DOM.personaBadgeContainer.style.display = 'flex';
        
        // Highlight active session item in sidebar
        const items = DOM.sessionsList.querySelectorAll('.session-item');
        items.forEach(it => {
            if (it.getAttribute('data-id') === sessionId) {
                it.classList.add('active');
            } else {
                it.classList.remove('active');
            }
        });
        
        // Close sidebar on mobile after choosing a thread
        DOM.sidebar.classList.remove('open');
        
        await loadMessages(sessionId);
    }

    async function createNewSession(optionalName = null) {
        try {
            const res = await fetch('/api/sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: optionalName || 'New Chat' })
            });
            const session = await res.json();
            
            state.activeSessionId = session.id;
            DOM.activeSessionTitle.textContent = session.name;
            DOM.personaBadgeContainer.style.display = 'flex';
            
            await loadSessions();
            await selectSession(session.id, session.name);
            
            DOM.userInputTextbox.focus();
        } catch (err) {
            console.error('Failed to create new session:', err);
        }
    }

    async function deleteSession(sessionId) {
        try {
            await fetch(`/api/sessions/${sessionId}`, { method: 'DELETE' });
            if (state.activeSessionId === sessionId) {
                state.activeSessionId = null;
                DOM.activeSessionTitle.textContent = 'Select or Create a Chat';
                DOM.personaBadgeContainer.style.display = 'none';
                showWelcomeScreen();
            }
            await loadSessions();
        } catch (err) {
            console.error('Failed to delete session:', err);
        }
    }

    function enableRenameSession(sessionItemElement, sessionId, oldName) {
        const wrapper = sessionItemElement.querySelector('.session-name-wrapper');
        const textSpan = wrapper.querySelector('.session-name');
        
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'session-name-input';
        input.value = oldName;
        
        wrapper.innerHTML = '';
        wrapper.appendChild(input);
        input.focus();
        input.select();
        
        const finishRename = async () => {
            const newName = input.value.trim() || oldName;
            if (newName !== oldName) {
                try {
                    await fetch(`/api/sessions/${sessionId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name: newName })
                    });
                    if (state.activeSessionId === sessionId) {
                        DOM.activeSessionTitle.textContent = newName;
                    }
                } catch (err) {
                    console.error('Rename failed:', err);
                }
            }
            await loadSessions();
        };

        input.addEventListener('blur', finishRename);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                input.blur(); // Triggers blur listener
            } else if (e.key === 'Escape') {
                input.value = oldName; // Reset
                input.blur();
            }
        });
    }

    // ==========================================================================
    // MESSAGES RENDERING & PARSING COMPONENT
    // ==========================================================================
    async function loadMessages(sessionId) {
        try {
            const res = await fetch(`/api/sessions/${sessionId}/messages`);
            const messages = await res.json();
            
            DOM.messagesStream.innerHTML = '';
            
            if (messages.length === 0) {
                showWelcomeScreen();
                return;
            }
            
            hideWelcomeScreen();
            
            messages.forEach(msg => {
                appendMessageBubble(msg.sender, msg.text);
            });
            
            scrollToBottom();
        } catch (err) {
            console.error('Failed to load messages:', err);
        }
    }

    function appendMessageBubble(sender, text) {
        const row = document.createElement('div');
        row.className = `message-row ${sender}-row`;
        
        // Avatar element
        const avatar = document.createElement('div');
        if (sender === 'user') {
            avatar.className = 'avatar ' + (state.settings.user_avatar || 'user-avatar-1');
        } else {
            avatar.className = 'avatar bot-avatar';
        }
        
        const bubble = document.createElement('div');
        bubble.className = 'message-bubble';
        
        if (sender === 'bot') {
            bubble.innerHTML = parseMarkdownHTML(text);
            attachCopyCodeListeners(bubble);
        } else {
            bubble.textContent = text;
        }
        
        row.appendChild(avatar);
        row.appendChild(bubble);
        
        DOM.messagesStream.appendChild(row);
        scrollToBottom();
    }

    function appendTypingIndicator() {
        const row = document.createElement('div');
        row.className = 'message-row bot-row typing-row';
        row.id = 'bot-typing-row';
        
        const avatar = document.createElement('div');
        avatar.className = 'avatar bot-avatar';
        
        const bubble = document.createElement('div');
        bubble.className = 'message-bubble typing-bubble';
        bubble.innerHTML = `
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        `;
        
        row.appendChild(avatar);
        row.appendChild(bubble);
        DOM.messagesStream.appendChild(row);
        scrollToBottom();
    }

    function removeTypingIndicator() {
        const row = document.getElementById('bot-typing-row');
        if (row) row.remove();
    }

    function showWelcomeScreen() {
        DOM.welcomeScreen.style.display = 'flex';
        DOM.messagesStream.style.display = 'none';
    }

    function hideWelcomeScreen() {
        DOM.welcomeScreen.style.display = 'none';
        DOM.messagesStream.style.display = 'block';
    }

    function scrollToBottom() {
        DOM.chatViewport.scrollTo({
            top: DOM.chatViewport.scrollHeight,
            behavior: 'smooth'
        });
    }

    // Elegant Custom Markdown Parser to parse bullet points, headers, inline codes, and fenced blocks
    function parseMarkdownHTML(raw) {
        let html = escapeHTML(raw);
        
        // 1. Code blocks extraction and translation ( ```lang ... ``` )
        const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
        html = html.replace(codeBlockRegex, (match, lang, code) => {
            const uniqueId = 'code-' + Math.random().toString(36).substr(2, 9);
            const language = lang || 'code';
            
            return `
                <div class="code-header-block">
                    <span>${language}</span>
                    <button class="copy-code-btn" data-target="${uniqueId}">Copy Code</button>
                </div>
                <pre><code id="${uniqueId}">${code.trim()}</code></pre>
            `;
        });
        
        // 2. Bold text translation ( **text** )
        html = html.replace(/\*\*([\s\S]*?)\*\*/g, '<strong>$1</strong>');
        
        // 3. Headers translation ( ### header , ## header )
        html = html.replace(/^###\s+(.*?)$/gm, '<h3>$1</h3>');
        html = html.replace(/^##\s+(.*?)$/gm, '<h2>$1</h2>');
        
        // 4. Bullet lists ( - item )
        html = html.replace(/^\s*-\s+(.*?)$/gm, '<li>$1</li>');
        // Wrap contiguous list tags into UL blocks
        html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
        
        // 5. Ordered lists ( 1. item )
        html = html.replace(/^\s*\d+\.\s+(.*?)$/gm, '<li>$1</li>');
        // Simple line break paragraphs
        const paragraphs = html.split('\n\n');
        html = paragraphs.map(p => {
            if (p.trim().startsWith('<pre') || p.trim().startsWith('<h') || p.trim().startsWith('<ul') || p.trim().startsWith('<ol') || p.trim().startsWith('<div')) {
                return p;
            }
            return `<p>${p.replace(/\n/g, '<br>')}</p>`;
        }).join('');

        return html;
    }

    function attachCopyCodeListeners(containerElement) {
        const copyBtns = containerElement.querySelectorAll('.copy-code-btn');
        copyBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetId = btn.getAttribute('data-target');
                const codeSnippet = document.getElementById(targetId);
                
                if (codeSnippet) {
                    navigator.clipboard.writeText(codeSnippet.innerText).then(() => {
                        const originalText = btn.textContent;
                        btn.textContent = 'Copied!';
                        btn.style.color = '#22c55e';
                        setTimeout(() => {
                            btn.textContent = originalText;
                            btn.style.color = '';
                        }, 2000);
                    }).catch(err => {
                        console.error('Failed to copy text:', err);
                    });
                }
            });
        });
    }

    // Escapes special characters for safe render in HTML
    function escapeHTML(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // ==========================================================================
    // VOICE COMPONENT: MICROPHONE INPUT & TTS SPEECH NARRATOR
    // ==========================================================================
    
    // Voice-to-Text Input (STT)
    function initSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.warn('Speech Recognition not supported in this browser.');
            DOM.voiceInputBtn.style.display = 'none';
            return;
        }
        
        const rec = new SpeechRecognition();
        rec.continuous = false;
        rec.interimResults = false;
        rec.lang = 'en-US';
        
        rec.onstart = () => {
            state.isListening = true;
            DOM.voiceInputBtn.classList.add('active');
            DOM.pulseMicRing.style.display = 'block';
            DOM.userInputTextbox.placeholder = 'Listening to your voice... Speak clearly.';
        };
        
        rec.onend = () => {
            state.isListening = false;
            DOM.voiceInputBtn.classList.remove('active');
            DOM.pulseMicRing.style.display = 'none';
            DOM.userInputTextbox.placeholder = 'Type a message or press the microphone...';
        };
        
        rec.onresult = (e) => {
            const transcript = e.results[0][0].transcript;
            DOM.userInputTextbox.value = transcript;
            DOM.userInputTextbox.focus();
            
            // Auto submit
            setTimeout(() => {
                submitChatMessage();
            }, 500);
        };
        
        rec.onerror = (e) => {
            console.error('Speech recognition error:', e.error);
        };
        
        state.recognition = rec;
    }

    function toggleSpeechInput() {
        if (!state.recognition) return;
        
        if (state.isListening) {
            state.recognition.stop();
        } else {
            state.recognition.start();
        }
    }

    // Text-to-Speech Output (TTS Audio Player)
    function initSpeechSynthesis() {
        if (!window.speechSynthesis) {
            console.warn('Text to Speech is not supported in this browser.');
            DOM.ttsBtn.style.display = 'none';
            return;
        }
        
        // Cache voices on load
        window.speechSynthesis.onvoiceschanged = () => {
            state.voices = window.speechSynthesis.getVoices();
        };
        state.voices = window.speechSynthesis.getVoices();
    }

    function toggleTTSNarration() {
        state.isTTSActive = !state.isTTSActive;
        toggleTTSUI();
        
        // Save state immediately via settings API
        saveQuickPreference({ speech_output_enabled: state.isTTSActive ? 'true' : 'false' });
    }

    function toggleTTSUI() {
        if (state.isTTSActive) {
            DOM.ttsBtn.classList.add('active');
            DOM.ttsBtn.querySelector('.tts-off-icon').style.display = 'none';
            DOM.ttsBtn.querySelector('.tts-on-icon').style.display = 'block';
        } else {
            DOM.ttsBtn.classList.remove('active');
            DOM.ttsBtn.querySelector('.tts-off-icon').style.display = 'block';
            DOM.ttsBtn.querySelector('.tts-on-icon').style.display = 'none';
            
            // Stop speaking immediately if disabled
            if (window.speechSynthesis) {
                window.speechSynthesis.cancel();
            }
        }
    }

    function speakBotResponse(htmlText) {
        if (!state.isTTSActive || !window.speechSynthesis) return;
        
        // Stop any running narration first
        window.speechSynthesis.cancel();
        
        // Strip HTML, markdown patterns and code blocks so TTS narration sounds organic
        let cleanText = htmlText
            .replace(/<pre[\s\S]*?<\/pre>/g, '[Code snippet omitted]')
            .replace(/<div[\s\S]*?<\/div>/g, '')
            .replace(/<\/?[^>]+(>|$)/g, "")
            .replace(/\*+/g, "")
            .trim();
            
        if (cleanText.length === 0) return;
        
        const utterance = new SpeechSynthesisUtterance(cleanText);
        
        // Find a nice natural voice (e.g. Google US English, Samantha, etc.)
        const preferredVoice = state.voices.find(voice => 
            voice.name.includes('Google') && voice.lang.includes('en')
        ) || state.voices.find(voice => 
            voice.name.includes('Natural') || voice.name.includes('Samantha')
        ) || state.voices[0];
        
        if (preferredVoice) {
            utterance.voice = preferredVoice;
        }
        
        utterance.rate = 1.05; // Slightly faster pacing
        utterance.pitch = 1.0;
        
        window.speechSynthesis.speak(utterance);
    }

    // ==========================================================================
    // CONTROLLER & NETWORKING
    // ==========================================================================
    async function submitChatMessage() {
        const text = DOM.userInputTextbox.value.trim();
        if (!text) return;
        
        // Create session dynamically if none active
        if (!state.activeSessionId) {
            await createNewSession("Chat Session");
        }
        
        // Clear input box
        DOM.userInputTextbox.value = '';
        DOM.userInputTextbox.style.height = 'auto'; // Reset text area height
        
        hideWelcomeScreen();
        
        // Append user bubble
        appendMessageBubble('user', text);
        
        // Display typing indicator while backend responds
        appendTypingIndicator();
        
        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: state.activeSessionId,
                    message: text
                })
            });
            const data = await res.json();
            
            removeTypingIndicator();
            
            if (res.status === 200) {
                appendMessageBubble('bot', data.response);
                
                // Speak response out loud
                speakBotResponse(data.response);
                
                // If thread renamed, reload threads sidebar
                if (data.session_name_updated) {
                    DOM.activeSessionTitle.textContent = data.new_session_name;
                    await loadSessions();
                }
            } else {
                appendMessageBubble('bot', `⚠️ **Server error:** ${data.error || 'An unexpected error occurred.'}`);
            }
        } catch (err) {
            removeTypingIndicator();
            appendMessageBubble('bot', `❌ **Failed to reach host backend.** Please ensure the Python server is actively running on port 5000.`);
            console.error('Chat error:', err);
        }
    }

    async function saveQuickPreference(prefDict) {
        try {
            await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(prefDict)
            });
        } catch (err) {
            console.error('Failed to sync preference:', err);
        }
    }

    // ==========================================================================
    // INTERACTION & LISTENERS BINDINGS
    // ==========================================================================
    function setupEventListeners() {
        
        // Submit chat form
        DOM.chatInputForm.addEventListener('submit', (e) => {
            e.preventDefault();
            submitChatMessage();
        });
        
        DOM.userInputTextbox.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submitChatMessage();
            }
        });
        
        // Resize textarea automatically as typing flows
        DOM.userInputTextbox.addEventListener('input', () => {
            DOM.userInputTextbox.style.height = 'auto';
            DOM.userInputTextbox.style.height = (DOM.userInputTextbox.scrollHeight - 6) + 'px';
        });
        
        // Microphone trigger click
        DOM.voiceInputBtn.addEventListener('click', toggleSpeechInput);
        
        // Header tools clicks
        DOM.newChatBtn.addEventListener('click', () => createNewSession());
        DOM.ttsBtn.addEventListener('click', toggleTTSNarration);
        
        // Quick Theme Toggle carousel loop
        DOM.quickThemeBtn.addEventListener('click', () => {
            const themes = ['cyberpunk-nebula', 'classic-dark', 'midnight-aura', 'sunset-glow', 'emerald-forest'];
            const current = state.settings.current_theme || 'cyberpunk-nebula';
            const nextIdx = (themes.indexOf(current) + 1) % themes.length;
            const nextTheme = themes[nextIdx];
            
            state.settings.current_theme = nextTheme;
            applyTheme(nextTheme);
            DOM.selectTheme.value = nextTheme;
            
            saveQuickPreference({ current_theme: nextTheme });
        });
        
        // Toggle Mobile Sidebars
        DOM.sidebarOpenBtn.addEventListener('click', () => {
            DOM.sidebar.classList.add('open');
        });
        
        DOM.sidebarCloseBtn.addEventListener('click', () => {
            DOM.sidebar.classList.remove('open');
        });
        
        // Close sidebar on viewport click (only applicable for mobiles)
        DOM.chatViewport.addEventListener('click', () => {
            DOM.sidebar.classList.remove('open');
        });

        // ---------------------------------------------------------
        // Modal Panel Listeners
        // ---------------------------------------------------------
        const openModal = () => {
            DOM.settingsModal.style.display = 'flex';
            // Sync values from state
            DOM.inputUserName.value = state.settings.user_name || 'Sqrock Intern';
            DOM.selectTheme.value = state.settings.current_theme || 'cyberpunk-nebula';
            DOM.selectPersona.value = state.settings.active_persona || 'assistant';
            DOM.selectProvider.value = state.settings.active_provider || 'mock';
            
            // Mask keys visual syncing
            DOM.inputOpenaiKey.value = state.settings.openai_api_key || '';
            DOM.inputGeminiKey.value = state.settings.gemini_api_key || '';
        };

        const closeModal = () => {
            DOM.settingsModal.style.display = 'none';
        };

        DOM.settingsTriggerBtn.addEventListener('click', openModal);
        DOM.sidebarProfileTrigger.addEventListener('click', (e) => {
            // Avoid triggering settings if clicking Settings cog button inside footer
            if (e.target.closest('.settings-btn-icon')) return;
            openModal();
        });
        
        DOM.settingsCloseBtn.addEventListener('click', closeModal);
        DOM.settingsCancelBtn.addEventListener('click', closeModal);
        
        // Close modal when clicking dark translucent overlay
        DOM.settingsModal.addEventListener('click', (e) => {
            if (e.target === DOM.settingsModal) closeModal();
        });

        // Tab Navigation inside modal
        DOM.modalTabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                DOM.modalTabBtns.forEach(b => b.classList.remove('active'));
                DOM.tabPanes.forEach(p => p.classList.remove('active'));
                
                btn.classList.add('active');
                const tabId = 'tab-' + btn.getAttribute('data-tab');
                document.getElementById(tabId).classList.add('active');
            });
        });

        // Avatar option pick picker
        DOM.avatarOptions.forEach(opt => {
            opt.addEventListener('click', () => {
                DOM.avatarOptions.forEach(o => o.classList.remove('selected'));
                opt.classList.add('selected');
            });
        });

        // Mask/Show passwords eye clicker
        document.querySelectorAll('.eye-toggle-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const input = btn.previousElementSibling;
                if (input.type === 'password') {
                    input.type = 'text';
                    btn.querySelector('svg').style.color = 'var(--accent-secondary)';
                } else {
                    input.type = 'password';
                    btn.querySelector('svg').style.color = '';
                }
            });
        });

        // Settings API Dropdown fields toggler
        DOM.selectProvider.addEventListener('change', (e) => {
            toggleProviderFields(e.target.value);
        });

        // Save Settings Action
        DOM.settingsSaveBtn.addEventListener('click', async () => {
            const activeAvatarOpt = document.querySelector('.avatar-option.selected');
            const avatarVal = activeAvatarOpt ? activeAvatarOpt.getAttribute('data-avatar') : 'user-avatar-1';
            
            const payload = {
                user_name: DOM.inputUserName.value.trim() || 'Sqrock Intern',
                user_avatar: avatarVal,
                current_theme: DOM.selectTheme.value,
                active_persona: DOM.selectPersona.value,
                active_provider: DOM.selectProvider.value,
                openai_api_key: DOM.inputOpenaiKey.value.trim(),
                gemini_api_key: DOM.inputGeminiKey.value.trim()
            };
            
            try {
                const res = await fetch('/api/settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                
                if (res.status === 200) {
                    closeModal();
                    await loadSettings();
                    
                    // If active thread is open, notify user of updated defaults
                    if (state.activeSessionId) {
                        await loadMessages(state.activeSessionId);
                    }
                } else {
                    alert('Failed to save settings. Please verify details.');
                }
            } catch (err) {
                console.error('Settings save fail:', err);
                alert('Connection failure while saving preferences.');
            }
        });

        // Welcome screen interactive persona activation
        DOM.personaCards.forEach(card => {
            card.addEventListener('click', async () => {
                const personaVal = card.getAttribute('data-persona');
                
                // Highlight persona on UI
                applyActivePersonaBadge(personaVal);
                
                // Save immediately
                await saveQuickPreference({ active_persona: personaVal });
                state.settings.active_persona = personaVal;
                
                // Show floating text alert
                const originalColor = card.style.borderColor;
                card.style.borderColor = 'var(--accent-secondary)';
                setTimeout(() => {
                    card.style.borderColor = originalColor;
                }, 800);
            });
        });

        // Suggestions pills click handlers
        DOM.suggestionPills.forEach(pill => {
            pill.addEventListener('click', () => {
                const prompt = pill.textContent.replace(/"/g, '');
                DOM.userInputTextbox.value = prompt;
                DOM.userInputTextbox.focus();
                DOM.userInputTextbox.dispatchEvent(new Event('input')); // fires auto-resizer
            });
        });
    }

    // ==========================================================================
    // INITIALIZATION TRIGGER
    // ==========================================================================
    initApp();

});
