// Shared script for Tinnitus Therapy Suite persistence
// Include this at the bottom of therapy pages to handle auto-save/load

(function () {
    const APP_VERSION = "2026.06.33";

    /** 
     * Helpers for consistent localStorage interaction
     * Initialized at the top to ensure availability for immediate-run IIFEs.
     */
    let _memStorage = {};
    let _memSessionActive = false;
    let activeSessionKey = null; // Tracks the unlocked key for the current session

    const isStorageAvailable = () => {
        try { localStorage.setItem('tts_t', '1'); localStorage.removeItem('tts_t'); return true; }
        catch (e) { return false; }
    };

    const _safeGet = (k) => { try { return localStorage.getItem(k); } catch (e) { return _memStorage[k]; } };
    const _safeSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { _memStorage[k] = v; } };

    const getJson = (key, defaultVal = []) => {
        const val = _safeGet('tts_' + key);
        try { return val ? JSON.parse(val) : defaultVal; } catch (e) { return defaultVal; }
    };
    const setJson = (key, val) => _safeSet('tts_' + key, JSON.stringify(val));

    const loadSetting = (key, defaultVal) => {
        const val = _safeGet('tts_' + key);
        return val === null ? defaultVal : val;
    };

    const saveSetting = (key, val) => {
        // Technical Guard: Enforce safety bounds at the persistence layer
        if (key === 'cr_baseFreq' || key === 'st_vol' || key === 'volMaster' || key === 'wearing_hearing_aids' || key === 'onboarding_step' || key === 'noise_pulse_rate' || key === 'noise_pulse_depth' || key === 'ai_enabled') {
            const num = parseFloat(val); // Convert value to number for numerical checks
            if (key.includes('vol') && (num < 0 || num > 100)) return;
            if (key === 'cr_baseFreq' && (num < 20 || num > 20000)) return;
            if (key === 'noise_pulse_rate' && (num < 0 || num > 10)) return;
            if (key === 'noise_pulse_depth' && (num < 0 || num > 1)) return;
            // New validation for boolean setting
            if (key === 'wearing_hearing_aids' && (val !== 'true' && val !== 'false')) return;
            if (key === 'ai_enabled' && (val !== 'true' && val !== 'false')) return;
            if (key === 'onboarding_step' && (num < 0 || num > 6 || !Number.isInteger(num))) return; // Validate onboarding step
        }
        _safeSet('tts_' + key, val);
    };

    const getTodayKey = () => new Date().toISOString().split('T')[0];

    /**
     * Session Authorization
     * Marks the onboarding as complete and authorizes the current session.
     */
    function completeOnboarding() {
        try {
            saveSetting('onboarding_step', '6'); // Mark as fully complete
            saveSetting('last_seen_version', APP_VERSION);
            try { sessionStorage.setItem('tts_session_active', 'true'); } catch (e) { }
            _memSessionActive = true;
        } catch (e) { console.error("TTS: Failed to save onboarding state.", e); }
        console.log("TTS: Onboarding completed.");
    }

    /**
     * Advances the user to a specific onboarding step.
     * @param {number} step - The target onboarding step (e.g., 1 for disclaimer, 2 for hearing aids, 5 for complete).
     */
    function setOnboardingStep(step) {
        // Removed the "advancing only" restriction to allow users to go back and correct decisions.
        saveSetting('onboarding_step', step.toString());
        console.log(`TTS: Onboarding step set to ${step}.`);
    }

    /**
     * Estimates the current usage of localStorage for the origin.
     * Returns usage in KB.
     */
    function getLocalStorageUsage() {
        let total = 0;
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            const value = localStorage.getItem(key);
            // Estimate size: key length + value length (each char is 2 bytes in JS strings)
            total += key.length + value.length;
        }
        return (total / 1024).toFixed(2); // Convert bytes to KB
    }

    /**
     * Requests that the browser treat the storage for this origin as persistent.
     */
    async function requestPersistentStorage() {
        if (navigator.storage && navigator.storage.persist) {
            try {
                const isPersisted = await navigator.storage.persist();
                if (isPersisted) console.log("TTS: Persistent storage granted.");
                else console.warn("TTS: Persistent storage denied.");
            } catch (e) { console.error("TTS: Error requesting persistence:", e); }
        }
    }
    requestPersistentStorage();

    /**
     * PrivacyAudit provides metadata about the user's local security state.
     */
    function getPrivacyAudit() {
        const encryptedKey = loadSetting('gemini_api_key_encrypted', null);
        const pinSet = encryptedKey !== null;
        const rcSet = loadSetting('gemini_api_key_rc_encrypted', null) !== null;

        return {
            storageUsedKB: getLocalStorageUsage(),
            aiEncryptionActive: pinSet,
            recoveryCodeActive: rcSet,
            isAILocked: pinSet && !activeSessionKey,
            isAIConfigured: !!(activeSessionKey || loadSetting('gemini_api_key', '')),
            dataPolicy: "Local-Only / Zero-Server"
        };
    }

    let MAINTENANCE_MODE = false; // Default to OPEN; only close if maintenance.json says so

    // ⚠️ CRITICAL SECURITY WARNING ⚠️
    // DIRECTLY INCLUDING YOUR GEMINI API KEY IN CLIENT-SIDE CODE IS UNSAFE FOR PRODUCTION.
    /**
     * Telemetry Configuration
     * Point this to your proxy or a webhook to monitor suite health and usage.
     */
    const TELEMETRY_ENDPOINT = "YOUR_DISCORD_WEBHOOK_URL_HERE";

    /**
     * Manages state and interactions for the Google Gemini AI integration.
     * Encapsulates the API key, model initialization, and specific therapeutic helpers.
     */
    class TinnitusAIManager {
        constructor() {
            this.genAI = null;
            this.decryptedKey = null;
            this.disclaimer = "Medical Disclaimer: This suggestion is generated by AI (Gemini) for educational purposes. It is not a substitute for professional medical advice, diagnosis, or treatment.";
            this.modelName = "gemini-1.5-flash"; // Stable 1.5 Flash
            this.detectedModels = []; // Cache for discovered models
        }

        /**
         * Robustly resolves the GoogleGenerativeAI class from various global namespaces.
         */
        _getSDK() {
            try {
                // Common global paths for various CDN builds (UMD/Browser bundles)
                const check = (p) => typeof p === 'function' ? p : null;

                const attempts = [
                    check(window.GoogleGenerativeAI),
                    check(window.google?.generativeai?.GoogleGenerativeAI),
                    check(window.google?.generativeAi?.GoogleGenerativeAI),
                    check(window.google?.generativeai?.default?.GoogleGenerativeAI),
                    check(window.google?.generativeAi?.default?.GoogleGenerativeAI),
                    check(window.google?.generativeai), // Sometimes namespace is the constructor
                    check(window.google?.generativeAi)
                ];

                for (const p of attempts) {
                    if (typeof p === 'function') return p;
                }

                // Diagnostic: If namespace exists but class is missing, log keys for debugging
                if (window.google) {
                    const gai = window.google.generativeai || window.google.generativeAi;
                    if (gai) {
                        console.warn("TTS AI SDK Debug: Namespace found but class missing. Gai keys:", Object.keys(gai));
                    } else {
                        console.warn("TTS AI SDK Debug: 'google' object found but 'generativeai' missing. Google keys:", Object.keys(window.google));
                    }
                } else {
                    // Final attempt: scan window for any function that looks like the constructor
                    if (typeof window.GoogleGenerativeAI === 'function') return window.GoogleGenerativeAI;
                }

                return null;
            } catch (e) {
                console.error("TTS: Error resolving AI SDK:", e);
                return null;
            }
        }

        /**
         * Initializes the Generative AI SDK with the provided or stored key.
         */
        init(key = null) {
            if (key) {
                this.decryptedKey = key;
                // Sync back to session variable for cross-module availability
                activeSessionKey = key;
                try { sessionStorage.setItem('tts_gemini_key_session', key); } catch (e) { }
            } else {
                // Attempt to load from session memory (variable or sessionStorage) or plain-text storage
                this.decryptedKey = activeSessionKey ||
                    (function () { try { return sessionStorage.getItem('tts_gemini_key_session'); } catch (e) { return null; } })() ||
                    loadSetting('gemini_api_key', null);

                if (this.decryptedKey) activeSessionKey = this.decryptedKey;
            }

            const activeKey = this.decryptedKey;
            const SDK = this._getSDK();

            try {
                if (SDK && activeKey && activeKey !== "ENCRYPTED_KEY_LOCKED") {
                    this.genAI = new SDK(activeKey);
                } else {
                    this.genAI = null;
                }
            } catch (e) {
                console.warn("AI Initialization failed: Check API Key or SDK availability.");
                this.genAI = null;
            }
        }

        /**
         * Diagnostic tool: Queries the API for a list of models supported by the current key.
         * Useful for debugging regional 404 errors.
         */
        async listAvailableModels() {
            if (!this.genAI) this.init();
            try {
                // The SDK doesn't always expose listModels directly on the GenAI instance 
                // depending on the version/build, but we can attempt to fetch it via the v1 endpoint.
                const key = this.decryptedKey;
                if (!key || key === "ENCRYPTED_KEY_LOCKED") return { success: false, message: "API key not available." };
                const response = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${key}`);
                const data = await response.json();

                if (data.error) {
                    return { success: false, error: `${data.error.code}: ${data.error.message}` };
                }
                if (data.models) {
                    // Only use models that support text generation (filtering out Imagen/Veo)
                    const compatible = data.models
                        .filter(m => m.supportedGenerationMethods.includes('generateContent'))
                        .map(m => m.name.replace('models/', ''));
                    this.detectedModels = compatible;
                    console.log("[TTS AI Diagnostics] Authorized models for this key:", compatible);
                    return { success: true, models: compatible };
                }
                return { success: false, message: "Could not retrieve model list." };
            } catch (e) {
                return { success: false, error: e.message };
            }
        }

        /**
         * Performs a connectivity test to verify the API key is working.
         */
        async performTest() {
            // Self-heal: Attempt to re-prime the engine in case the SDK loaded late
            if (!this.genAI) this.init();

            const SDK = this._getSDK();

            if (!SDK) {
                const scriptTag = document.querySelector('script[src*="generative-ai"]');
                let diag = "Global variable 'GoogleGenerativeAI' not found.";
                if (!scriptTag) diag = "SDK script tag missing from HTML.";
                else diag = "Script tag present but global namespace is empty. This usually indicates an ESM/UMD conflict.";

                return { success: false, message: `AI SDK failed to load (${diag}). Check connection or disable ad-blockers (allow unpkg.com and cdn.jsdelivr.net).` };
            }

            if (!this.genAI) {
                return { success: false, message: "AI Engine not initialized. Please provide a valid API key from Google AI Studio." };
            }

            try {
                let result;

                // Ensure we have a list of authorized models for this key first
                if (this.detectedModels.length === 0) {
                    const diag = await this.listAvailableModels();
                    if (!diag.success) {
                        if (diag.error?.includes("403")) throw new Error("API_KEY_INVALID_OR_RESTRICTED");
                        if (diag.error?.includes("404")) throw new Error("API_NOT_ENABLED");
                        throw new Error(diag.error || "LIST_MODELS_FAILED");
                    }
                    if (this.detectedModels.length === 0) throw new Error("NO_MODELS_AVAILABLE");
                }

                console.log("[TTS AI] Starting connectivity sequence...");

                // Dynamically build attempt list from the models authorized for this specific key
                const attempts = this.detectedModels.map(m => ({
                    model: m,
                    version: (m.includes('1.0') || m.includes('1.5') || m === 'gemini-pro') ? "v1" : "v1beta"
                }));

                let lastError = null;
                for (const attempt of attempts) {
                    try {
                        this.modelName = attempt.model;
                        const model = this.genAI.getGenerativeModel({ model: attempt.model }, { apiVersion: attempt.version });
                        result = await model.generateContent("Test connection: hello");
                        if (result) break;
                    } catch (err) {
                        lastError = err;
                        console.warn(`[TTS AI] ${attempt.model} (${attempt.version}) failed:`, err.message);
                    }
                }

                if (!result && lastError) throw lastError;
                if (!result) throw new Error("No response from AI models.");

                const response = result.response;
                let text = "";
                try {
                    text = response.text();
                } catch (e) {
                    if (e.message.includes("SAFETY")) return { success: false, message: "Connection successful, but the test prompt was blocked by safety filters." };
                    throw e;
                }

                return text ? { success: true, message: `Connection successful! Gemini responded using ${this.modelName}.` }
                    : { success: false, message: "Connection successful, but Gemini gave an empty response." };
            } catch (error) {
                console.error("Gemini test connection error:", error);

                // Specific check for transport-level failures (offline or blocked by firewall)
                // We check navigator.onLine first; we don't treat 404/403 (fetch errors) as transport errors
                const isTransportError = !navigator.onLine ||
                    (error.message.includes("NetworkError") && !error.message.includes("status"));

                if (isTransportError) {
                    return { success: false, message: "Network connection error. Gemini requires an active internet connection to reach Google's servers." };
                }

                let errorMessage = "API connection failed: ";
                if (error.message.includes("API key not valid") || error.message.includes("403")) {
                    errorMessage += "Invalid API key or 403 Forbidden. Verify your key at Google AI Studio.";
                } else if (error.message.includes("404") || error.message.includes("API_NOT_ENABLED") || error.message.includes("NO_MODELS_AVAILABLE")) {
                    errorMessage += "API not enabled (404). You must enable the 'Generative Language API' in the Google Cloud Console.";
                    console.error("[TTS AI Troubleshooting] API/Model Not Found (404):");
                    console.info("1. Open the API Library: https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com");
                    console.info("2. CRITICAL: Use the dropdown next to the 'Google Cloud' logo at the TOP of the page to select your project first. The 'ENABLE' button is hidden until a project is selected.");
                    console.info("3. Ensure your API Key is not restricted to the wrong APIs.");
                    console.info("4. RECOMMENDATION: Use a key from https://aistudio.google.com/app/apikey for zero-config.");
                } else if (error.message.includes("blocked due to SAFETY")) {
                    errorMessage += "Gemini blocked the test prompt due to safety concerns. Try a different test.";
                } else if (error.message.includes("rate limit")) {
                    errorMessage += "Rate limit exceeded. Try again later.";
                } else {
                    errorMessage += `Error: ${error.message}`;
                }
                return { success: false, message: errorMessage };
            }
        }

        /**
         * Centralized method to handle AI requests with safety settings and disclaimers.
         */
        async fetchAIAssistance(taskType, payload) {
            if (!this.genAI) this.init();

            if (loadSetting('ai_enabled', 'true') !== 'true') {
                return "AI Features are currently disabled via your Privacy Settings. Re-enable them in the Privacy Hub to continue.";
            }

            if (!this.genAI) {
                return "AI Features are currently unconfigured. Please check the suite's setup instructions to enable Gemini assistance.";
            }

            const runRequest = async (modelName, version = 'v1') => {
                const model = this.genAI.getGenerativeModel({
                    model: modelName,
                    safetySettings: [ // Force stable v1 for production reliability
                        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                    ]
                }, { apiVersion: version });
                const chat = model.startChat({
                    history: [{ role: "user", parts: [{ text: typeof payload.system_instruction === 'string' ? payload.system_instruction : JSON.stringify(payload.system_instruction) }] }],
                    generationConfig: { maxOutputTokens: 200 },
                });
                const result = await chat.sendMessage(typeof payload.input === 'string' ? payload.input : JSON.stringify(payload.input));
                const response = result.response;

                if (!response) throw new Error("Empty response received from AI.");

                try {
                    return response.text();
                } catch (textErr) {
                    // Handle safety blocks or empty candidate lists gracefully
                    if (textErr.message.includes("SAFETY") || (response.promptFeedback && response.promptFeedback.blockReason)) {
                        return "The AI response was filtered due to safety concerns. Please try rephrasing your request.";
                    }
                    console.error("AI Text Extraction Error:", textErr);
                    return "The AI responded, but the content could not be displayed.";
                }
            };

            try {
                let responseText;
                let attempts = [];

                // Auto-discover models if not yet detected (e.g. on first automatic dashboard request)
                if (this.detectedModels.length === 0) {
                    await this.listAvailableModels();
                }

                if (this.detectedModels.length > 0) {
                    attempts = this.detectedModels.map(m => ({
                        model: m,
                        version: (m.includes('1.0') || m.includes('1.5') || m === 'gemini-pro') ? "v1" : "v1beta"
                    }));
                } else {
                    attempts = [
                        { model: "gemini-1.5-flash", version: "v1" },
                        { model: "gemini-1.5-flash", version: "v1beta" },
                        { model: "gemini-1.5-pro", version: "v1" },
                        { model: "gemini-1.5-pro", version: "v1beta" },
                        { model: "gemini-pro", version: "v1" },
                        { model: "gemini-pro", version: "v1beta" }
                    ];
                }

                for (let i = 0; i < attempts.length; i++) {
                    try {
                        responseText = await runRequest(attempts[i].model, attempts[i].version);
                        this.modelName = attempts[i].model;
                        break;
                    } catch (err) {
                        if (err.message.includes("API key not valid") || !navigator.onLine || i === attempts.length - 1) throw err;
                        console.warn(`[TTS] Request failed for ${attempts[i].model}. Trying fallback...`);
                    }
                }
                return `${responseText}\n\n<i>${this.disclaimer}</i>`;
            } catch (error) {
                console.error(`AI Integration Error [${taskType}]:`, error);

                // Specific error categorization
                if (error.message.includes("API key not valid") || error.message.includes("403")) return "Configuration Error: The provided API key is invalid or unauthorized.";
                if (error.message.includes("quota")) return "The AI service is currently at capacity. Please try again in a few minutes.";
                if (!navigator.onLine) return "Connection Error: You appear to be offline. AI features require an internet connection.";
                if (error.message.includes("404") || error.message.toLowerCase().includes("not found")) return "The requested AI model was not found (404).";

                return "Could not connect to the AI assistant. Please try again later.";
            }
        }

        async getBalancedThoughtSuggestion(automaticThought) {
            const prompt = {
                system_instruction: `You are a specialized CBT assistant for tinnitus habituation. 
            Perform a full 'Thought Record' analysis on the user's input. 
            Provide a response with exactly three sections:
            1. EVIDENCE AGAINST: (Logical reasons why the catastrophic thought is not 100% true)
            2. BALANCED PERSPECTIVE: (A realistic, TRT-aligned reframing)
            3. GROUNDING ACTION: (One 30-second physical or mental task).
            
            Guidelines:
            - Be supportive and objective.
            - Reference 'habituation' as a biological process.
            - Keep each section to 2 sentences max.
            - Output as plain text with clear headings.
            
            The analysis is for a clinical record, so ensure it is high-value.`,
                input: automaticThought
            };
            return await this.fetchAIAssistance("cbt_reframing", prompt);
        }

        async getSOSSupport(userInput = "I am having a spike right now.") {
            const latestDistress = getLatestLogData('distress_log');
            const context = latestDistress ? `[Context: User's latest distress score is ${latestDistress.data}/100 recorded on ${latestDistress.date}] ` : "";

            const prompt = {
                system_instruction: "You are a specialized tinnitus crisis counselor. The user is experiencing a 'spike'. Provide immediate CBT reframing, reassure them that spikes are temporary, and suggest a 2-minute breathing focus.",
                input: context + userInput
            };
            return await this.fetchAIAssistance("sos_support", prompt);
        }

        async getSoundRecipe(description) {
            const prompt = {
                system_instruction: "You are a sound therapy expert. Based on the user's description of their tinnitus suggest a 'Sound Recipe' using noise colors and nature sounds.",
                input: description
            };
            return await this.fetchAIAssistance("sound_recipe", prompt);
        }

        async getPatternAnalysis(userQuery = "") {
            const anonymizedHistory = {
                usage_patterns: getJson('usage_log', {}),
                distress_history: getJson('distress_log', {}),
                reports_sleep_issues: loadSetting('reports_sleep_issues', 'false') === 'true',
                recent_situational_contexts: getThoughtRecords().slice(-5).map(tr => ({
                    date: new Date(tr.timestamp).toLocaleDateString(),
                    situation: tr.situation,
                    emotions: tr.emotions
                }))
            };
            const prompt = {
                system_instruction: "Identify potential correlations in therapy logs, reported sleep issues, and situational data. State clearly that these are correlations and suggest one focus area for next week.",
                input: { user_question: userQuery, anonymized_data: anonymizedHistory }
            };
            return await this.fetchAIAssistance("pattern_finder", prompt);
        }

        async getTRTExplanation(question) {
            const prompt = {
                system_instruction: "You are a TRT coach. Explain concepts like habituation and neuroplasticity in supportive, everyday language.",
                input: question
            };
            return await this.fetchAIAssistance("trt_coach", prompt);
        }

        async getClinicalSummary() {
            const reportData = getClinicalReportData("AI Summary Generation", {}, {});
            const prompt = {
                system_instruction: "Summarize the user's progress for an audiologist. Focus on trends in distress, adherence, and reported sleep issues. Write one professional paragraph. This is a Professional Summary for a clinical report. Conclude by explicitly stating that the full therapeutic suite is available for professional use and patient tracking at https://tinnitus.trahreg.com.",
                input: {
                    distress: reportData.psychological.lastTHIScore,
                    usage: reportData.usage.todayMinutes,
                    reports_sleep_issues: loadSetting('reports_sleep_issues', 'false') === 'true'
                }
            };
            return await this.fetchAIAssistance("clinical_summary", prompt);
        }

        async getDailyMotivation() {
            const prompt = {
                system_instruction: "Find one 'win' in usage/distress trends and provide a short motivational boost.",
                input: { usage: getJson('usage_log', {}), distress: getJson('distress_log', {}) }
            };
            return await this.fetchAIAssistance("daily_coach", prompt);
        }

        async getEnvironmentalAdvice(dbLevel, floorStatus) {
            const prompt = {
                system_instruction: "Provide one tip on whether this environment is ideal for tinnitus habituation based on noise levels.",
                input: { db_level: dbLevel, status: floorStatus }
            };
            return await this.fetchAIAssistance("environmental_advice", prompt);
        }

        async getMindfulnessScript(thought) {
            const prompt = {
                system_instruction: "Generate a custom 1-minute mindfulness script designed to help a user detach from this specific thought.",
                input: thought
            };
            return await this.fetchAIAssistance("mindfulness_script", prompt);
        }

        async getHabituationForecast() {
            const data = Object.entries(getDistressScores()).map(([date, score]) => ({ date, score }));
            if (data.length < 3) return "Insufficient data for a forecast.";
            const prompt = {
                system_instruction: "Predict future habituation progress and provide one tip based on distress trends and reported sleep issues. State this is an AI projection.",
                input: {
                    thi_history: data,
                    reports_sleep_issues: loadSetting('reports_sleep_issues', 'false') === 'true'
                }
            };
            return await this.fetchAIAssistance("habituation_forecast", prompt);
        }

        async getPersonalizedInsights() {
            const report = getClinicalReportData("Insight Generation", {}, {});
            const prompt = {
                system_instruction: "Analyze the data for positive trends and consider reported sleep issues. Provide one paragraph of encouragement and one actionable tip.",
                input: {
                    thi: report.psychological.lastTHIScore,
                    usage: report.usage,
                    ri: report.ri.latestRIResult,
                    reports_sleep_issues: loadSetting('reports_sleep_issues', 'false') === 'true'
                }
            };
            return await this.fetchAIAssistance("progress_insights", prompt);
        }
    }


    /**
     * Derives a cryptographic key from a PIN using PBKDF2.
     * @param {string} pin - The user's PIN.
     * @param {Uint8Array} salt - A random salt.
     * @returns {Promise<CryptoKey>} The derived AES-GCM key.
     */
    async function deriveKeyFromPin(pin, salt) {
        const enc = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey(
            "raw",
            enc.encode(pin),
            { name: "PBKDF2" },
            false,
            ["deriveBits", "deriveKey"]
        );
        return crypto.subtle.deriveKey(
            {
                name: "PBKDF2",
                salt: salt,
                iterations: 100000, // High iteration count for security
                hash: "SHA-256",
            },
            keyMaterial,
            { name: "AES-GCM", length: 256 },
            true,
            ["encrypt", "decrypt"]
        );
    }

    /**
     * Encrypts the Gemini API key using AES-GCM.
     * @param {string} apiKey - The plain text Gemini API key.
     * @param {string} pin - The user's PIN.
     * @returns {Promise<{pinPath: object, rcPath: object, recoveryCode: string}>}
     */
    async function encryptGeminiKey(apiKey, pin) {
        // Generate a 16-character hexadecimal recovery code
        const recoveryCode = Array.from(crypto.getRandomValues(new Uint8Array(8)), b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
        const enc = new TextEncoder();
        const encodedKey = enc.encode(apiKey);

        async function _encryptWithSecret(secret) {
            const salt = crypto.getRandomValues(new Uint8Array(16));
            const iv = crypto.getRandomValues(new Uint8Array(12));
            const cryptoKey = await deriveKeyFromPin(secret, salt);
            const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, cryptoKey, encodedKey);
            return {
                encryptedKey: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
                salt: btoa(String.fromCharCode(...salt)),
                iv: btoa(String.fromCharCode(...iv))
            };
        }

        const pinPath = await _encryptWithSecret(pin);
        const rcPath = await _encryptWithSecret(recoveryCode);

        return {
            pinPath,
            rcPath,
            recoveryCode
        };
    }

    /**
     * Decrypts the Gemini API key using AES-GCM.
     * @param {string} input - The user's PIN or Recovery Code.
     * @returns {Promise<string|null>} The decrypted API key or null if decryption fails.
     */
    async function decryptGeminiKey(input) {
        // Attempt path 1: The Standard PIN
        let key = await _attemptDecrypt(input, 'gemini_api_key_encrypted', 'gemini_api_key_salt', 'gemini_api_key_iv');
        if (key) {
            activeSessionKey = key;
            tinnitusAI.init(key);
            return key;
        }

        // Attempt path 2: The Recovery Code
        key = await _attemptDecrypt(input, 'gemini_api_key_rc_encrypted', 'gemini_api_key_rc_salt', 'gemini_api_key_rc_iv');
        if (key) {
            activeSessionKey = key;
            tinnitusAI.init(key);
            return key;
        }

        return null;
    }

    async function _attemptDecrypt(secret, keySet, saltSet, ivSet) {
        const encKey = loadSetting(keySet, null);
        const salt = loadSetting(saltSet, null);
        const iv = loadSetting(ivSet, null);
        if (!encKey || !salt || !iv) return null;

        try {
            const decodedEncKey = Uint8Array.from(atob(encKey), c => c.charCodeAt(0));
            const decodedSalt = Uint8Array.from(atob(salt), c => c.charCodeAt(0));
            const decodedIv = Uint8Array.from(atob(iv), c => c.charCodeAt(0));
            const cryptoKey = await deriveKeyFromPin(secret, decodedSalt);
            const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: decodedIv }, cryptoKey, decodedEncKey);
            return new TextDecoder().decode(decrypted);
        } catch (e) {
            return null;
        }
    }

    /**
     * Resets the application onboarding status and session.
     */
    function resetOnboarding(dryRun = false) {
        (async () => {
            console.log(`TTS: Initiating ${dryRun ? 'Dry Run' : ''} onboarding reset...`);
            // Clear all keys prefixed with tts_ to ensure a true clean slate
            try {
                const keysToRemove = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && key.startsWith('tts_')) keysToRemove.push(key);
                }
                console.log(`[DryRun] Would remove ${keysToRemove.length} tts_ keys from localStorage.`);
                if (!dryRun) {
                    keysToRemove.forEach(k => localStorage.removeItem(k));
                }

                // Clear Service Workers to prevent stale state persistence
                if ('serviceWorker' in navigator) {
                    const regs = await navigator.serviceWorker.getRegistrations();
                    for (let r of regs) {
                        console.log(`[DryRun] Would unregister SW: ${r.active ? r.active.scriptURL : 'unknown'}`);
                        if (!dryRun) await r.unregister();
                    }
                }
            } catch (e) { console.warn("TTS: Partial reset during onboarding clear."); }

            if (dryRun) {
                console.log("[DryRun] Would clear internal _memStorage and _memSessionActive.");
                console.log("[DryRun] Would clear sessionStorage.");
            } else {
                _memStorage = {};
                _memSessionActive = false;
                // Clear session storage as well to reset session-bound gatekeeper states
                sessionStorage.clear();
            }

            if (dryRun) {
                alert("Onboarding Dry Run successful. Check console for details.");
            } else {
                alert("System reset successful. Redirecting to welcome screen...");
                window.location.replace('index.html?reset=' + Date.now());
            }
        })();
    }

    /**
     * Retrieves the most recent entry from a JSON-based log.
     * @param {string} logKey - The key (without tts_ prefix) for the log.
     * @returns {object|null} The latest entry or null.
     */
    function getLatestLogData(logKey) {
        const log = getJson(logKey, {});
        const dates = Object.keys(log).sort();
        if (dates.length === 0) return null;
        const latestDate = dates[dates.length - 1];
        return { date: latestDate, data: log[latestDate] };
    }

    function getThoughtRecords() { return getJson('thought_records', []); }
    function getDistressScores() { return getJson('distress_log', {}); }
    function getDailyUsage() {
        const log = getJson('usage_log', {});
        return log[getTodayKey()] || 0;
    }

    function logDistressScore(score) {
        const log = getJson('distress_log', {});
        log[getTodayKey()] = score;
        setJson('distress_log', log);
    }

    function logUsageMinutes(mins) {
        const log = getJson('usage_log', {});
        const today = getTodayKey();
        log[today] = (log[today] || 0) + mins;
        setJson('usage_log', log);
    }

    function logRIResult(seconds) {
        const log = getJson('ri_log', {});
        const today = getTodayKey();
        if (!log[today]) log[today] = [];
        log[today].push(seconds);
        setJson('ri_log', log);
    }

    function logTMCPoint(freq, level) {
        const log = getJson('tmc_log', {});
        log[freq] = level;
        setJson('tmc_log', log);
    }

    function logQFactor(qFactor) {
        const log = getJson('q_factor_log', {});
        log[getTodayKey()] = qFactor;
        setJson('q_factor_log', log);
    }

    function logLoudnessGrowthPoint(freq, obj, subj) {
        const log = getJson('lg_log', {});
        const today = getTodayKey();
        if (!log[today]) log[today] = [];
        log[today].push({ freq, obj, subj });
        setJson('lg_log', log);
    }

    function logThoughtRecordEntry(entry) {
        const records = getThoughtRecords();
        records.push({ ...entry, timestamp: new Date().toISOString() });
        setJson('thought_records', records);
    }

    /**
     * Returns the status of the patient's journey through clinical milestones.
     * Aligned with Appendix E of the User Manual.
     */
    function getMilestoneProgress() {
        const labels = [
            "1. Baseline",
            "2. Technical Mastery",
            "3. Psychological Shift",
            "4. Early Habituation",
            "5. Partial Habituation",
            "6. Full Habituation"
        ];
        // Manual override state for the checkboxes in stats.html
        const userState = getJson('milestone_state', [false, false, false, false, false, false]);

        // Auto-detect some milestones based on actual data
        const log = getJson('usage_log', {});
        const distress = getJson('distress_log', {});
        const notch = loadSetting('notchL', null);

        const autoState = [...userState];
        if (Object.keys(distress).length > 0) autoState[0] = true;
        if (notch !== null && Object.values(log).some(v => v > 0)) autoState[1] = true;

        // Logic for Early/Partial/Full Habituation based on THI
        const scores = Object.values(distress).map(Number);
        if (scores.length >= 2) {
            if (scores[0] - scores[scores.length - 1] >= 7) autoState[3] = true; // Early: MCSD reduction
            if (scores[scores.length - 1] <= 16) autoState[5] = true; // Full: Grade 1
        }

        const rawPercentage = (autoState.filter(Boolean).length / autoState.length) * 100;
        const percentage = Math.round(rawPercentage / 5) * 5;
        return { labels, state: autoState, percentage };
    }

    function toggleMilestone(index) {
        const data = getMilestoneProgress();
        data.state[index] = !data.state[index];
        setJson('milestone_state', data.state);
        return getMilestoneProgress();
    }

    /**
     * Marks the splash screen as having been shown for the current browser session.
     */
    function markSplashShown() {
        try {
            sessionStorage.setItem('tts_splash_shown', 'true');
            console.log("TTS: Splash screen marked as shown for this session.");
        } catch (e) { }
    }

    function resetModuleSettings(prefixArray) {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('tts_')) {
                const settingKey = key.replace('tts_', '');
                if (prefixArray.some(p => settingKey.startsWith(p))) {
                    keysToRemove.push(key);
                }
            }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
        alert("Settings reset. Reloading module...");
        window.location.reload();
    }

    // Pre-fetch system voices to ensure they are indexed by the browser for the narrator
    if (typeof speechSynthesis !== 'undefined') {
        speechSynthesis.getVoices();
    }

    /**
     * SystemCompatibilityAudit provides automated checks to ensure the host 
     * browser and device meet the technical requirements for clinical audio.
     */
    class SystemCompatibilityAudit {
        static check() {
            const results = {
                audioContext: !!(window.AudioContext || window.webkitAudioContext),
                audioWorklet: !!(window.AudioContext && window.AudioContext.prototype && 'audioWorklet' in window.AudioContext.prototype) ||
                    !!(window.webkitAudioContext && window.webkitAudioContext.prototype && 'audioWorklet' in window.webkitAudioContext.prototype),
                webAssembly: typeof WebAssembly === 'object' && typeof WebAssembly.instantiate === 'function',
                localStorage: isStorageAvailable(),
                serviceWorker: 'serviceWorker' in navigator,
                secureContext: window.isSecureContext,
                pannerNode: !!(window.AudioContext && window.AudioContext.prototype && 'createStereoPanner' in window.AudioContext.prototype),
                mediaDevices: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
                vibrate: !!navigator.vibrate,
                isCompatible: false,
                errors: [],
                warnings: []
            };

            if (!results.audioContext) results.errors.push("Web Audio API not supported.");
            if (!results.webAssembly) results.errors.push("WebAssembly not supported (High-performance DSP disabled).");
            if (!results.localStorage) results.errors.push("LocalStorage is blocked or unavailable.");

            if (!results.secureContext) results.warnings.push("Non-Secure context detected. Worklets and PWA features will be restricted.");
            if (!results.audioWorklet) results.warnings.push("AudioWorklet not supported. Audio engine will use legacy fallback.");
            if (!results.pannerNode) results.warnings.push("StereoPanner API missing. Linear L/R balance controls may fail.");
            if (!results.mediaDevices) results.warnings.push("Microphone access restricted. Spectrogram and Meter tools will not function.");
            if (!results.vibrate) results.warnings.push("Haptic API unavailable. Tactile Bimodal pulses will be disabled.");

            results.isCompatible = results.errors.length === 0;
            return results;
        }
    }

    /**
     * Retrieves a unified validation status object covering engine, phase, and DSP tests.
     */
    function getUnifiedValidationStatus() {
        const engineResults = loadSetting('engine_validation_results', 'Not Performed');
        const phaseStatus = loadSetting('phase_status', 'Not Verified');
        const dspStatus = loadSetting('dsp_validation_status', 'Not Performed'); // Now loads from localStorage
        const spectralAuditResults = getJson('spectral_audit_results', {}); // Load spectral audit results
        const lastValidationDate = loadSetting('last_validation_date', null);

        const recommendations = [];
        let isValid = true;

        // Automated Compatibility Audit
        const compat = SystemCompatibilityAudit.check();
        if (!compat.isCompatible) {
            isValid = false;
            compat.errors.forEach(e => recommendations.push(`- Compatibility Error: ${e}`));
        }
        compat.warnings.forEach(w => recommendations.push(`- Compatibility Warning: ${w}`));

        // Check expiration (30 days)
        if (lastValidationDate) {
            const diff = Date.now() - new Date(lastValidationDate).getTime();
            if (diff > (30 * 24 * 60 * 60 * 1000)) {
                isValid = false;
                recommendations.push("- Your system validation has expired (older than 30 days). Please re-run System Validation.");
            }
        } else {
            isValid = false;
        }

        if (engineResults === 'Not Performed' || engineResults.includes('[FAIL]')) {
            isValid = false;
            recommendations.push("- Automated Engine Validation is missing or failed. Please run the 'System Validation' tool on the home page.");
        }

        if (phaseStatus === 'Not Verified') {
            isValid = false;
            recommendations.push("- Hardware Phase is unverified. Use the 'Phase Test' in System Validation to confirm headphone wiring.");
        } else if (phaseStatus.includes('Error')) {
            isValid = false;
            recommendations.push("- Phase error detected. Check for loose connections or virtual surround sound software.");
        }

        if (dspStatus.includes('FAIL')) {
            isValid = false;
            if (dspStatus.includes('Shallow Notch')) recommendations.push("- Shallow Notch failure: Clinical research targets >40dB attenuation. Disable any audio 'enhancer' or 'booster' browser extensions.");
            if (dspStatus.includes('Frequency Mismatch')) recommendations.push("- Frequency mismatch failure: Ensure your OS audio settings are set to 44.1kHz or 48kHz and restart your browser.");
            if (dspStatus.includes('Cross-over')) recommendations.push("- Filter Cross-over failure: The Low-Cut frequency must be lower than the High-Cut frequency. Adjust your filter sliders.");
        }

        // Integrate Spectral Audit Results
        let spectralAuditSummary = "Not Performed";
        if (Object.keys(spectralAuditResults).length > 0) {
            spectralAuditSummary = Object.entries(spectralAuditResults).map(([color, status]) => `${color}: ${status}`).join('; ');
            for (const color in spectralAuditResults) {
                if (spectralAuditResults[color].includes("FAILED")) {
                    isValid = false;
                    recommendations.push(`- Spectral Audit FAILED for ${color} noise. Check for silent or clipping output.`);
                }
            }
        }

        return {
            engine: engineResults,
            phase: phaseStatus,
            compatibility: compat,
            dsp: dspStatus,
            spectralAudit: spectralAuditSummary,
            isValid: isValid,
            lastDate: lastValidationDate,
            recommendations: recommendations
        };
    }

    /**
     * ClinicalSafetyAudit provides a suite of diagnostic tests to ensure 
     * the integrity and safety of the therapeutic signals.
     */
    class ClinicalSafetyAudit {
        constructor(generator) {
            this.generator = generator;
        }

        /**
         * Performs a spectral density check to ensure noise colors are 
         * mathematically consistent with their definitions.
         */
        async runSpectralAudit() {
            if (!this.generator || !this.generator.ctx) return { success: false, error: "No context" };

            const colors = ['white', 'pink', 'brown'];
            const results = {};

            for (const color of colors) {
                const buf = this.generator.generate(color, 4096);
                if (!buf) { results[color] = "FAILED: No Buffer"; continue; }

                const data = buf.getChannelData(0);
                let peak = 0;
                for (let i = 0; i < data.length; i++) {
                    const abs = Math.abs(data[i]);
                    if (abs > peak) peak = abs;
                }

                // Check for silence or clipping
                if (peak === 0) results[color] = "FAILED: Silent";
                else if (peak > 1.0) results[color] = "FAILED: Clipping";
                else results[color] = `PASS (Peak: ${peak.toFixed(2)})`;
            }
            return results;
        }

        /**
         * Validates that all critical settings are within safe therapeutic bounds.
         */
        validateSettingsIntegrity() {
            const criticalKeys = ['st_vol', 'dec_vol', 'len_vol', 'cr_baseFreq', 'notchL'];
            const issues = [];

            criticalKeys.forEach(key => {
                const val = parseFloat(loadSetting(key, null));
                if (val === null) return;
                if (key.includes('vol') && (val < 0 || val > 100)) issues.push(`Unsafe volume on ${key}: ${val}`);
                if (key.includes('Freq') && (val < 20 || val > 20000)) issues.push(`Unsafe frequency on ${key}: ${val}`);
            });

            return issues.length === 0 ? { valid: true } : { valid: false, issues };
        }
    }

    /**
     * NoiseGenerator handles the procedural generation of calibrated noise colors.
     * Includes peak volume normalization to ensure consistent therapeutic output levels.
     */
    // Add a switch to turn on/off auto tone matching process.
    class NoiseGenerator {
        static _wasmModule = null; // Global cache for compiled DSP engine
        static _workletLoading = new Map(); // Cache loading promises per AudioContext

        constructor(ctx) {
            // Robust verification of the AudioContext before initialization
            // We check for createBuffer as it is the most reliable indicator of a BaseAudioContext
            this.ctx = (ctx && typeof ctx.createBuffer === 'function') ? ctx : null;
            if (!this.ctx) {
                console.warn("[NoiseEngine] Generator initialized with invalid or missing AudioContext.");
            }
        }

        /**
         * Peak normalization to ensure consistent therapeutic output.
         */
        _normalize(data, targetPeak = 0.5) { // Changed default targetPeak to 0.5 for consistency with usage
            let peak = 0;
            for (let i = 0; i < data.length; i++) {
                const abs = Math.abs(data[i]);
                if (abs > peak) peak = abs;
            }
            // Only normalize if significantly off-target to prevent volume jumps
            if (peak > 0 && Math.abs(peak - targetPeak) > 0.05) {
                const factor = targetPeak / peak;
                for (let i = 0; i < data.length; i++) data[i] *= factor;
            }
        }

        /**
         * Generates a pre-rendered AudioBuffer of the specified noise color.
         */
        generate(color, bufferSize, options = {}) {
            if (!this.ctx) return null;
            const targetColor = (color || 'white').toLowerCase().trim().replace(/(_noise| noise)/g, '');
            const sampleRate = this.ctx.sampleRate;
            const size = (typeof bufferSize === 'number' && bufferSize > 0) ? bufferSize : sampleRate * 2;

            let buffer;
            try {
                buffer = this.ctx.createBuffer(2, size, sampleRate);
            } catch (e) {
                console.error("NoiseGenerator: Failed to create AudioBuffer.", e);
                return null;
            }

            const dL = buffer.getChannelData(0);
            const dR = buffer.getChannelData(1);
            const sr = this.ctx.sampleRate;
            const ratio = 44100 / sr;

            // Scaled Paul Kellet Filter Bank (Pink Noise)
            const poles = [0.99886, 0.99332, 0.96900, 0.86870, 0.55000, -0.76160];
            const gains = [0.0555179, 0.0750759, 0.1538520, 0.3104856, 0.5329522, -0.0168980];
            const p = poles.map(val => Math.pow(Math.abs(val), ratio) * Math.sign(val));
            const g = gains.map((val, i) => val * (1 - Math.abs(p[i])) / (1 - Math.abs(poles[i])));

            // Scaled Brown Lossy Integrator
            const brP = Math.pow(1 / 1.02, ratio);
            const brG = (1 - brP) * 30;

            // Aesthetic spectral auto-selection for neural-aligned buffer generation
            let activeColor = targetColor;
            const enableAutoMatch = (options.enableAutoMatch !== undefined) ? options.enableAutoMatch : (loadSetting('enable_auto_match', 'true') === 'true');
            const target = parseFloat(loadSetting('notchL', loadSetting('toneFreqL', loadSetting('cr_baseFreq', 6000))));
            if (activeColor === 'auto' && enableAutoMatch) {
                if (target < 1200) activeColor = 'brown';
                else if (target > 10000) activeColor = 'violet'; // Extreme high focus for ultra-sharp tones
                else if (target > 6000) activeColor = 'blue'; // Match high tones with high-frequency emphasis
                else activeColor = 'pink';
            }
            else if (activeColor === 'auto' && !enableAutoMatch) activeColor = 'pink';

            const peakMap = {
                'white': 0.35,
                'pink': 0.5,
                'brown': 0.65,
                'red': 0.75,
                'blue': 0.4,
                'violet': 0.45,
                'rain': 0.5,
                'ocean': 0.6,
                'chimes': 0.5
            };
            const currentPeakTarget = peakMap[activeColor] || 0.5;

            switch (activeColor) {
                case 'white': {
                    for (let i = 0; i < size; i++) dL[i] = (Math.random() * 2 - 1);
                    break;
                }
                case 'chimes': {
                    const target = parseFloat(loadSetting('notchL', loadSetting('toneFreqL', loadSetting('cr_baseFreq', 6000))));
                    let base = target;
                    while (base > 1200) base /= 2;
                    const ratios = [1, 1.25, 1.5, 2, 2.5, 3];
                    let phs = new Float32Array(ratios.length);
                    let envs = new Float32Array(ratios.length);
                    for (let i = 0; i < size; i++) {
                        let v = 0;
                        for (let h = 0; h < ratios.length; h++) {
                            if (Math.random() < 0.00002) envs[h] = 1.0;
                            v += Math.sin(phs[h]) * envs[h] * (1 / (h + 1));
                            phs[h] = (phs[h] + (2 * Math.PI * base * ratios[h]) / sr) % (2 * Math.PI);
                            envs[h] *= 0.99992;
                        }
                        dL[i] = v * 0.5;
                    }
                    break;
                }
                case 'pink': {
                    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, lastIn = 0, hpState = 0;
                    for (let i = 0; i < size; i++) {
                        const w = Math.random() * 2 - 1;
                        b0 = p[0] * b0 + w * g[0]; b1 = p[1] * b1 + w * g[1]; b2 = p[2] * b2 + w * g[2];
                        b3 = p[3] * b3 + w * g[3]; b4 = p[4] * b4 + w * g[4]; b5 = p[5] * b5 + w * g[5];

                        const raw = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * .5362) * 0.85;
                        const out = raw - lastIn + (0.997 * hpState);
                        lastIn = raw; hpState = out;
                        dL[i] = out;
                        b6 = w * .115926;
                    }
                    break;
                }
                case 'red': {
                    let l1 = 0, l2 = 0, lastIn = 0, hpState = 0, srRatio = 44100 / sr;
                    for (let i = 0; i < size; i++) {
                        const w = Math.random() * 2 - 1;
                        l1 = (l1 * 0.999) + (w * 0.01);
                        l2 = (l2 * 0.999) + (l1 * 0.01);

                        const raw = l2 * 45;
                        const out = raw - lastIn + (0.997 * hpState);
                        lastIn = raw; hpState = out;
                        dL[i] = out;
                    }
                    break;
                }
                case 'rain': {
                    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, lastIn = 0, hpState = 0, patter = 0;
                    for (let i = 0; i < size; i++) {
                        const w = Math.random() * 2 - 1;
                        b0 = p[0] * b0 + w * g[0]; b1 = p[1] * b1 + w * g[1]; b2 = p[2] * b2 + w * g[2];
                        b3 = p[3] * b3 + w * g[3]; b4 = p[4] * b4 + w * g[4]; b5 = p[5] * b5 + w * g[5];

                        const rawPink = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * .5362) * 0.85;

                        const impulse = Math.random() > 0.9997 ? (Math.random() * 2 - 1) * 0.4 : 0;
                        patter = (patter * 0.995) + impulse;
                        const mixed = (rawPink * 0.85 + patter * 0.15);

                        const out = mixed - lastIn + (0.997 * hpState);
                        lastIn = mixed; hpState = out;
                        dL[i] = out;
                        b6 = w * .115926;
                    }
                    break;
                }
                case 'ocean': {
                    let l1 = 0, l2 = 0, lastIn = 0, hpState = 0;
                    for (let i = 0; i < size; i++) {
                        const w = Math.random() * 2 - 1;
                        l1 = (l1 * 0.999) + (w * 0.01);
                        l2 = (l2 * 0.999) + (l1 * 0.01);
                        let red = l2 * 45;

                        const out = red - lastIn + (0.997 * hpState);
                        lastIn = red; hpState = out;

                        const surge = Math.sin(2 * Math.PI * 0.06 * (i / sr)) * 0.3 + 0.7;
                        dL[i] = out * surge;
                    }
                    break;
                }
                case 'blue': {
                    let c0 = 0, c1 = 0, c2 = 0;
                    for (let i = 0; i < size; i++) {
                        const white = Math.random() * 2 - 1;
                        c0 = 0.8 * c0 + white * 0.2;
                        c1 = 0.92 * c1 + white * 0.15;
                        c2 = 0.99 * c2 + white * 0.05;
                        const blue = white - (c0 + c1 + c2) * 0.2;
                        dL[i] = blue * 1.5;
                    }
                    break;
                }
                case 'violet': {
                    let lastV = 0;
                    for (let i = 0; i < size; i++) { const w = Math.random() * 2 - 1; dL[i] = (w - lastV) * 0.8; lastV = w; }
                    break;
                }
                case 'brown': {
                    let lastBr = 0, lastIn = 0, hpState = 0;
                    for (let i = 0; i < size; i++) {
                        const w = Math.random() * 2 - 1;
                        const raw = (lastBr * brP) + (w * brG);
                        lastBr = raw;
                        // One-pole high-pass (DC blocker) at ~20Hz
                        const out = raw - lastIn + (0.997 * hpState);
                        lastIn = raw; hpState = out;
                        dL[i] = out;
                    }
                    break;
                }
                default: {
                    for (let i = 0; i < size; i++) dL[i] = (Math.random() * 2 - 1);
                }
            }

            dR.set(dL); // Mirror for stereo fallback
            // Normalize to the dynamic peak target to match standardized Worklet engine
            this._normalize(dL, currentPeakTarget);
            this._normalize(dR, currentPeakTarget);
            return buffer;
        }

        /**
         * Attempts to create an AudioWorkletNode for real-time noise generation.
         * Falls back to a looped AudioBufferSourceNode if noise-processor.js is missing
         * or if the browser does not support AudioWorklets.
         */
        async createSafeNoiseNode(color, options = {}) {
            const globalAutoMatch = loadSetting('enable_auto_match', 'true') === 'true';
            const { loop = true, bufferSize = null, enableAutoMatch = globalAutoMatch } = options;
            if (!this.ctx) return null;

            // Enforce 'auto' as the primary clinical default.
            // This ensures the noise spectrum is mathematically aligned with the user's tinnitus.
            let targetColor = (color || 'auto').toLowerCase().trim().replace(/(_noise| noise)/g, '');

            // Detect target frequency for clinical calibration
            const targetFreq = parseFloat(loadSetting('notchL', loadSetting('toneFreqL', loadSetting('cr_baseFreq', 6000))));

            if (!window.isSecureContext) {
                console.error('[NoiseGenerator] AudioWorklet requires a Secure Context (HTTPS or localhost). Fallback to buffer engine.');
            }

            if (this.ctx.audioWorklet) {
                try {
                    // Robust path resolution for subfolders (e.g. /docs/)
                    const isDocs = window.location.pathname.toLowerCase().includes('/docs/');
                    // Force cache refresh by appending the version number as a query parameter
                    const workletPath = (isDocs ? '../noise-processor.js' : 'noise-processor.js') + '?v=' + APP_VERSION;
                    console.log('[NoiseGenerator] Attempting to load worklet from:', workletPath);

                    let loadingPromise = NoiseGenerator._workletLoading.get(this.ctx);
                    if (!loadingPromise) {
                        console.log('[NoiseGenerator] Loading AudioWorklet module:', workletPath);
                        loadingPromise = this.ctx.audioWorklet.addModule(workletPath);
                        NoiseGenerator._workletLoading.set(this.ctx, loadingPromise);
                    }
                    try {
                        await loadingPromise;
                        console.log('[NoiseGenerator] AudioWorklet module loaded successfully.');
                    } catch (loadErr) {
                        NoiseGenerator._workletLoading.delete(this.ctx); // Reset to allow retry on next click
                        console.error(`[NoiseGenerator] AudioWorklet load error [${loadErr.name}]: ${loadErr.message}`);
                        throw loadErr;
                    }

                    if (!NoiseGenerator._wasmModule) {
                        try {
                            const wasmPath = (isDocs ? '../noise-generator.wasm' : 'noise-generator.wasm') + '?v=' + APP_VERSION;
                            const wasmResp = await fetch(wasmPath);
                            if (wasmResp.ok) {
                                const wasmBuf = await wasmResp.arrayBuffer();
                                NoiseGenerator._wasmModule = await WebAssembly.compile(wasmBuf);
                                console.log('[TTS] WASM DSP engine compiled and cached.');
                            } else {
                                console.warn(`[NoiseGenerator] WASM fetch returned status ${wasmResp.status}.`);
                            }
                        } catch (wasmErr) {
                            console.error('[NoiseGenerator] WASM compilation failed, falling back to JS:', wasmErr);
                        }
                    }

                    let node;
                    try {
                        node = new AudioWorkletNode(this.ctx, 'noise-processor', {
                            processorOptions: {
                                color: targetColor,
                                targetFreq: targetFreq,
                                enableAutoMatch: enableAutoMatch.toString(),
                                wasmModule: NoiseGenerator._wasmModule
                            },
                            numberOfInputs: 0,
                            numberOfOutputs: 1,
                            outputChannelCount: [2]
                        });
                        console.log('[NoiseGenerator] AudioWorkletNode created successfully.');
                    } catch (nodeErr) {
                        console.error('[NoiseGenerator] Failed to create AudioWorkletNode:', nodeErr);
                        throw nodeErr;
                    }

                    node.engineType = 'worklet';

                    // Helper method to update color without node recreation.
                    // This triggers the linear crossfade implemented in noise-processor.js.
                    node.updateColor = (newColor) => {
                        const cleanColor = (newColor || 'white').toLowerCase().trim().replace(/(_noise| noise)/g, '');
                        node.port.postMessage({ type: 'SET_COLOR', color: cleanColor });
                    };

                    // Helper method to update target frequency without node recreation.
                    node.updateTargetFreq = (newFreq) => {
                        const cleanFreq = parseFloat(newFreq);
                        node.port.postMessage({ type: 'SET_TARGET_FREQ', targetFreq: cleanFreq });
                    };

                    // Listen for internal DSP health reports from the audio thread
                    node.port.onmessage = (event) => {
                        if (event.data.type === 'DSP_WARNING') {
                            logTherapyError('AudioWorklet', event.data.message, { color, sampleRate: this.ctx.sampleRate });
                        } else if (event.data.type === 'DSP_METRIC') {
                            if (!event.data.isStable) {
                                console.warn(`[AudioEngine] High CPU Load: ${event.data.load}% at ${event.data.sampleRate}Hz`);
                                logTherapyError('Performance', `High DSP Load: ${event.data.load}%`, { color, sampleRate: event.data.sampleRate });
                            }
                        }
                    };

                    if (typeof node.start !== 'function') node.start = () => { };
                    if (typeof node.stop !== 'function') node.stop = () => { };

                    return node;
                } catch (e) {
                    console.warn("NoiseGenerator: AudioWorklet failed (noise-processor.js may be missing). Falling back to pre-rendered buffer.", e);
                }
            }

            const buffer = this.generate(targetColor, bufferSize, { enableAutoMatch });
            if (!buffer) {
                console.error("NoiseGenerator: Failed to create AudioBuffer for fallback. No noise will be generated.");
                return null;
            }

            const source = this.ctx.createBufferSource();
            source.buffer = buffer;
            source.engineType = 'buffer';
            source.loop = loop;

            // Add dummy methods to prevent UI crashes if the module expects a WorkletNode
            source.updateColor = (newColor) => {
                console.warn("[NoiseGenerator] Cannot update color on a BufferSourceNode. The node must be recreated.");
            };
            source.updateTargetFreq = (newFreq) => {
                console.warn("[NoiseGenerator] Cannot update frequency on a BufferSourceNode. The node must be recreated.");
            };
            if (typeof source.start !== 'function') source.start = () => { source.noteOn(0); };
            if (typeof source.stop !== 'function') source.stop = () => { source.noteOff(0); };

            return source;
        }
    }

    /** Compatibility wrapper for legacy procedural calls */
    function createTrahregNoise(ctx, color, bufferSize) {
        return new NoiseGenerator(ctx).generate(color, bufferSize);
    }

    /**
     * Retrieves list of audio devices.
     */
    async function getAudioDevices() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
            return { inputs: [], outputs: [] };
        }
        const devices = await navigator.mediaDevices.enumerateDevices();
        return {
            inputs: devices.filter(d => d.kind === 'audioinput'),
            outputs: devices.filter(d => d.kind === 'audiooutput')
        };
    }

    /**
     * Context-aware logger for technical and clinical auditing.
     * Saves exceptions to origin-private storage for clinical review.
     */
    function logTherapyError(module, error, context = {}) {
        const errorLog = getJson('error_log', []);
        const entry = {
            timestamp: new Date().toISOString(),
            module,
            message: error.message || error,
            context: {
                ...context,
                userAgent: navigator.userAgent,
                appVersion: APP_VERSION,
                sampleRate: (window.AudioContext || window.webkitAudioContext) ? 'Active' : 'N/A',
                online: navigator.onLine
            }
        };
        errorLog.push(entry);
        if (errorLog.length > 25) errorLog.shift(); // Keep logs lean
        setJson('error_log', errorLog);

        // Auto-report critical errors if telemetry is configured
        sendClinicalTelemetry('error', entry);

        console.error(`[Therapy Engine Error: ${module}]`, error);
    }

    function getTherapyErrorLog() { return getJson('error_log', []); }

    /**
     * Sends anonymous technical telemetry to the configured endpoint.
     * Strips all personal data; includes only module states and error codes.
     */
    async function sendClinicalTelemetry(type, data) {
        if (!TELEMETRY_ENDPOINT || !navigator.onLine) return;

        const isDiscord = TELEMETRY_ENDPOINT.includes('discord.com/api/webhooks');
        let body;

        if (isDiscord) {
            // Format payload for Discord Embeds
            body = JSON.stringify({
                username: "Trahreg Suite Health",
                avatar_url: "https://5310H.github.io/tinnitus_therapy/icon-192.png",
                embeds: [{
                    title: `Telemetry Event: ${type.toUpperCase()}`,
                    color: type === 'error' ? 16725074 : 16750848, // Red for error, Orange for recovery
                    timestamp: new Date().toISOString(),
                    fields: [
                        { name: "App Version", value: APP_VERSION, inline: true },
                        { name: "Module", value: window.location.pathname.split('/').pop() || 'Index', inline: true },
                        { name: "Context", value: "```json\n" + JSON.stringify(data, null, 2).substring(0, 1000) + "\n```" }
                    ]
                }]
            });
        } else {
            // Standard generic JSON payload
            body = JSON.stringify({ t: Date.now(), type, payload: data, v: APP_VERSION });
        }

        try {
            await fetch(TELEMETRY_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: body
            });
        } catch (e) { /* Silent fail to avoid disrupting user experience */ }
    }

    /**
     * Calculates the therapeutic boost based on the stored hearing profile and the "Half-Gain Rule."
     * This provides personalized compensation for users with hearing loss.
     * @param {number} freq - The target frequency in Hz.
     * @param {string} side - 'L' or 'R'.
     * @returns {number} The boost in dB (capped at 20dB for digital safety).
     */
    function getHearingBoost(freq, side) {
        // Ensure the audiogram module is loaded and the function is available
        if (typeof window.getJson !== 'function') return 0;

        // If the user indicates they are wearing hearing aids, disable digital boost
        const wearingHearingAids = loadSetting('wearing_hearing_aids', 'false') === 'true'; // Default to false if not set
        if (wearingHearingAids) {
            console.warn("Hearing boost disabled: User indicated they are wearing hearing aids to prevent double-amplification.");
            return 0; // Return 0 boost
        }
        const profile = getJson('hearing_profile', null);
        if (!profile || !profile[side]) return 0;

        const freqs = [250, 500, 750, 1000, 2000, 3000, 4000, 6000, 8000];
        const data = profile[side];

        if (!Array.isArray(data)) return 0;

        // Linear interpolation between audiogram points
        let hl = 0;
        if (freq <= freqs[0]) hl = data[0];
        else if (freq >= freqs[freqs.length - 1]) hl = data[data.length - 1];
        else {
            for (let i = 0; i < freqs.length - 1; i++) {
                if (freq >= freqs[i] && freq <= freqs[i + 1]) {
                    const ratio = (freq - freqs[i]) / (freqs[i + 1] - freqs[i]);
                    hl = data[i] + ratio * (data[i + 1] - data[i]);
                    break;
                }
            }
        }

        // Half-Gain Rule: boost = Loss / 2
        // Enforce a therapeutic ceiling of 20dB to prevent digital clipping/distortion
        return Math.min(20, Math.max(0, hl * 0.5));
    }

    /**
     * Returns a suggested L/R balance value (-1 to 1) based on the user's tinnitus side preference.
     * Used to provide an intelligent default for therapy modules.
     */
    function getBalancePreset() {
        const side = loadSetting('tinnitus_side', 'Both');
        if (side === 'L') return -0.5; // Default 50% shift to left
        if (side === 'R') return 0.5;  // Default 50% shift to right
        return 0; // Center
    }

    /**
     * Validates if a frequency is within safe bounds for the current audio context.
     */
    function isFrequencySafe(ctx, freq) {
        if (!ctx || isNaN(freq)) return false;
        const nyquist = ctx.sampleRate / 2;
        // Stay 5% away from Nyquist to prevent aliasing/filter instability
        return freq > 20 && freq < (nyquist * 0.95);
    }

    function exportAllData() {
        const data = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('tts_')) {
                data[key] = localStorage.getItem(key);
            }
        }
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `trahreg_tinnitus_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
    }

    /**
     * Exports clinical log data (THI and Usage) to a CSV format for research/clinical analysis.
     */
    function exportClinicalDataCSV() {
        const distress = getDistressScores();
        const usage = getJson('usage_log', {});
        const dates = Array.from(new Set([...Object.keys(distress), ...Object.keys(usage)])).sort();

        let csv = "Date,THI_Score,Usage_Minutes\n";
        dates.forEach(date => {
            const score = distress[date] || "";
            const mins = usage[date] || 0;
            csv += `${date},${score},${mins}\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `trahreg_clinical_data_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    }

    /**
     * Saves a soundscape preset (a collection of settings for a therapy module).
     * @param {string} name - The name of the preset.
     * @param {object} settings - An object containing the settings to save.
     */
    function saveSoundscapePreset(name, settings) {
        const presets = getJson('soundscape_presets', {});
        presets[name] = settings;
        setJson('soundscape_presets', presets);
        console.log(`TTS: Soundscape preset '${name}' saved.`);
    }

    /**
     * Loads a soundscape preset.
     * @param {string} name - The name of the preset.
     * @returns {object|null} The settings object for the preset, or null if not found.
     */
    function loadSoundscapePreset(name) {
        const presets = getJson('soundscape_presets', {});
        return presets[name] || null;
    }

    /**
     * Deletes a specific log entry from a JSON-based log.
     * Useful for GDPR compliance and correcting data entry errors.
     * @param {string} logKey - The log key (e.g., 'distress_log')
     * @param {string} entryKey - The date or index to remove
     */
    function deleteLogEntry(logKey, entryKey) {
        const log = getJson(logKey, {});
        if (Array.isArray(log)) {
            // If it's an array (like thought_records)
            const index = parseInt(entryKey);
            if (!isNaN(index)) {
                log.splice(index, 1);
                setJson(logKey, log);
            }
        } else {
            // If it's an object/map (like distress_log)
            if (log[entryKey] !== undefined) {
                delete log[entryKey];
                setJson(logKey, log);
            }
        }
        console.log(`TTS: Deleted entry ${entryKey} from ${logKey}.`);
    }

    function clearAllLogs() {
        const keys = ['distress_log', 'usage_log', 'ri_log', 'tmc_log', 'q_factor_log', 'lg_log', 'thought_records', 'error_log'];
        keys.forEach(k => localStorage.removeItem('tts_' + k));
        alert("All therapy logs have been cleared. Settings remain intact.");
    }

    function importAllData(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                Object.keys(data).forEach(key => {
                    if (key.startsWith('tts_')) localStorage.setItem(key, data[key]);
                });
                alert("Data imported successfully. Reloading...");
                window.location.reload();
            } catch (err) {
                alert("Error importing data. Ensure the file is a valid backup.");
            }
        };
        reader.readAsText(file);
    }

    function getClinicalReportData(modeName, settingsObj, techSpecsObj = {}) {
        const validation = getUnifiedValidationStatus();
        const usage = getDailyUsage();

        // Consolidate latest data retrieval using the new helper
        const latestMML = getLatestLogData('mml_log');
        let mmlSummary = "N/A";
        if (latestMML) {
            const mmlVal = Array.isArray(latestMML.data) ? latestMML.data.slice(-1)[0] : latestMML.data;
            mmlSummary = `Latest MML: ${mmlVal}%`;
        }

        const latestLG = getLatestLogData('lg_log');
        let latestLGSummary = "N/A";
        if (latestLG && latestLG.data) {
            const points = Array.isArray(latestLG.data) ? latestLG.data.length : 1;
            latestLGSummary = `Points: ${points}`;
        }

        const latestQF = getLatestLogData('q_factor_log');
        const latestQFactor = (latestQF && latestQF.data) ? latestQF.data : "N/A";

        const latestRI = getLatestLogData('ri_log');
        let riSummary = "N/A";
        if (latestRI) {
            const riVal = Array.isArray(latestRI.data)
                ? latestRI.data.join('s, ') + 's'
                : latestRI.data + 's';
            riSummary = `Date: ${latestRI.date} | Suppression Results: ${riVal}`;
        }

        const latestTHI = getLatestLogData('distress_log');
        const lastScore = latestTHI ? `${latestTHI.data}/100` : 'Not Performed';
        const lastTHIDateDisplay = latestTHI ? new Date(latestTHI.date).toLocaleDateString() : 'N/A';

        const thoughtRecords = getThoughtRecords();
        const thoughtRecordsCount = thoughtRecords.length;
        let recentThoughtSummary = "N/A";
        if (thoughtRecordsCount > 0) {
            const latest = thoughtRecords[thoughtRecordsCount - 1];
            recentThoughtSummary = `Date: ${new Date(latest.timestamp).toLocaleDateString()}\n`;
            recentThoughtSummary += `  - Situation: ${latest.situation}\n`;
            recentThoughtSummary += `  - Automatic Thought: ${latest.automaticThoughts}\n`;
            recentThoughtSummary += `  - Balanced Thought: ${latest.balancedThought}`;
        }
        const therapyRecs = getTherapyRecommendations();

        return {
            modeName,
            appVersion: APP_VERSION,
            exportDate: new Date().toLocaleString(),
            settings: settingsObj,
            techSpecs: techSpecsObj,
            usage: {
                todayMinutes: Math.round(usage),
                history: getJson('usage_log', {})
            },
            psychological: {
                lastTHIScore: lastScore,
                lastTHIDate: lastTHIDateDisplay,
                thiHistory: getDistressScores(),
                thoughtRecordsCount: thoughtRecordsCount,
                recentThoughtSummary: recentThoughtSummary
            },
            milestones: getMilestoneProgress(),
            recommendations: therapyRecs.status === 'complete' ? therapyRecs.recommendations : [],
            ri: {
                latestRIResult: riSummary
            },
            mml: {
                latestMMLResult: mmlSummary
            },
            lg: {
                latestLGTest: latestLGSummary
            },
            tmc: {
                latestQFactor: latestQFactor
            },
            hearingProfile: getJson('hearing_profile', { L: new Array(9).fill(0), R: new Array(9).fill(0) }),
            branding: {
                name: loadSetting('clinic_name', ''),
                logo: loadSetting('clinic_logo', '') // Can be URL or Base64
            },
            storage: { usageKB: getLocalStorageUsage() },
            systemStatus: {
                hardwarePhase: validation.phase,
                engineValidation: validation.engine,
                dspValidation: validation.dsp,
                actionableRecommendations: validation.recommendations
            }
        };
    }

    function generateClinicalReportText(reportData) {
        let text = `TRAHREG TINNITUS THERAPY SUITE - CLINICAL REPORT\n`;
        text += `App Version: ${reportData.appVersion}\n`;
        text += `Therapy Mode: ${reportData.modeName}\n`;
        text += `Export Date: ${reportData.exportDate}\n`;
        text += `Access: https://tinnitus.trahreg.com\n`;
        text += `-------------------------------------------\n`;

        text += `\nTHERAPY SETTINGS:\n`;

        if (reportData.aiSummary) {
            text += `\nPROFESSIONAL SUMMARY:\n`;
            text += `${reportData.aiSummary}\n`;
        }
        for (const [label, value] of Object.entries(reportData.settings)) {
            text += `${label}: ${value}\n`;
        }

        if (Object.keys(reportData.techSpecs).length > 0) {
            text += `\nTECHNICAL SPECIFICATIONS:\n`;
            for (const [label, value] of Object.entries(reportData.techSpecs)) {
                text += `${label}: ${value}\n`;
            }
        }

        text += `\nUSAGE & STATUS:\n`;
        text += `Today's Usage: ${reportData.usage.todayMinutes} minutes\n`;

        text += `\nPSYCHOLOGICAL BASELINE (CBT):\n`;
        text += `Last THI Score: ${reportData.psychological.lastTHIScore}\n`;
        text += `Last THI Date: ${reportData.psychological.lastTHIDate}\n`;

        if (reportData.recommendations.length > 0) {
            text += `\nPERSONALIZED THERAPY SUGGESTIONS:\n`;
            reportData.recommendations.forEach(r => {
                text += `- ${r.mode}: ${r.reason}\n`;
            });
        }

        text += `Thought Records Logged: ${reportData.psychological.thoughtRecordsCount}\n`;
        text += `Most Recent Record:\n${reportData.psychological.recentThoughtSummary}\n`;

        text += `\nRESIDUAL INHIBITION (RI):\n`;
        text += `Latest RI Result: ${reportData.ri.latestRIResult}\n`;

        text += `\nMINIMUM MASKING LEVEL (MML):\n`;
        text += `Latest MML Result: ${reportData.mml.latestMMLResult}\n`;

        text += `\nLOUDNESS GROWTH (LG):\n`;
        text += `Latest LG Test: ${reportData.lg.latestLGTest}\n`;

        text += `\nTINNITUS MASKING CURVE (TMC):\n`;
        text += `Latest Q-factor: ${reportData.tmc.latestQFactor}\n`;

        text += `\nSYSTEM STATUS:\n`;
        text += `Hardware Phase Status: ${reportData.systemStatus.hardwarePhase}\n`;
        text += `\nAUTOMATED ENGINE VALIDATION:\n${reportData.systemStatus.engineValidation}\n`;

        if (reportData.systemStatus.dspValidation !== 'Not Performed') {
            text += `\nINTERNAL DSP VALIDATION:\nStatus: ${reportData.systemStatus.dspValidation}\n`;
        }

        if (reportData.systemStatus.actionableRecommendations.length > 0) {
            text += `\nACTIONABLE RECOMMENDATIONS:\n${reportData.systemStatus.actionableRecommendations.join('\n')}\n`;
        }

        text += `\n-------------------------------------------`;
        return text.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n');
    }

    function generateClinicalReportHtml(reportData) {
        let html = `<div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1a1a1a; padding: 1in; max-width: 8.5in; margin: auto; background: #fff; line-height: 1.6; font-size: 12pt; box-sizing: border-box;">`;

        // Dynamic Clinic Branding Header
        html += `<div style="display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 30px;">`;
        html += `  <div style="flex: 1;">`;
        if (reportData.branding && reportData.branding.logo) {
            html += `    <img src="${reportData.branding.logo}" style="max-height: 50px; margin-bottom: 10px; display: block;">`;
        }
        html += `    <h1 style="font-size: 22pt; color: #1c1e21; margin: 0; font-weight: bold; line-height: 1;">Clinical Progress Report</h1>`;
        html += `    <p style="font-size: 14px; color: #7f8c8d; margin: 5px 0 0 0;">Trahreg Tinnitus Suite v${reportData.appVersion}</p>`;
        html += `  </div>`;
        html += `  <div style="text-align: right; flex: 1;">`;
        if (reportData.branding && reportData.branding.name) {
            html += `    <h3 style="margin: 0; color: #34495e; font-size: 16px;">${reportData.branding.name}</h3>`;
        }
        html += `    <p style="margin: 3px 0; font-size: 14px;"><b>Mode:</b> ${reportData.modeName}</p>`;
        html += `    <p style="margin: 3px 0; font-size: 14px;"><b>Exported:</b> ${reportData.exportDate}</p>`;
        html += `  </div>`;
        html += `</div>`;

        // Milestone Progress Block
        html += `<div style="background: #fdfdfd; border: 1px solid #ecf0f1; border-radius: 4px; padding: 15px; margin-bottom: 25px; page-break-inside: avoid;">`;
        html += `  <p style="font-size: 11px; color: #95a5a6; margin: 0 0 10px 0; text-transform: uppercase; font-weight: bold;">Habituation Milestone Progress</p>`;
        html += `  <div style="width: 100%; height: 10px; background: #eee; border-radius: 5px; overflow: hidden; margin-bottom: 8px;">`;
        html += `    <div style="width: ${reportData.milestones.percentage}%; height: 100%; background: #00bfa5;"></div>`;
        html += `  </div>`;
        const lastIdx = reportData.milestones.state.lastIndexOf(true);
        const phase = lastIdx !== -1 ? reportData.milestones.labels[lastIdx] : "Initial Baseline";
        html += `  <p style="font-size: 11pt; margin: 0; color: #1c1e21;">Current Phase: <b>${phase}</b> <span style="color: #7f8c8d; font-size: 10pt;">(${reportData.milestones.percentage}% Complete)</span></p>`;
        html += `</div>`;

        // Hearing Profile (Audiogram) Block
        if (reportData.hearingProfile && (reportData.hearingProfile.L?.some(v => v > 0) || reportData.hearingProfile.R?.some(v => v > 0))) {
            const hpFreqs = [250, 500, 750, 1000, 2000, 3000, 4000, 6000, 8000];
            const width = 600, height = 180, pad = 35;
            const gW = width - (pad * 2), gH = height - (pad * 2);

            html += `<div style="background: #fdfdfd; border: 1px solid #ecf0f1; border-radius: 4px; padding: 15px; margin-bottom: 25px; page-break-inside: avoid;">`;
            html += `  <p style="font-size: 11px; color: #95a5a6; margin: 0 0 10px 0; text-transform: uppercase; font-weight: bold;">Clinical Hearing Profile (Audiogram)</p>`;
            html += `  <div style="display: flex; gap: 20px; align-items: flex-start;">`;

            // SVG Graph
            html += `    <div style="flex: 1.5; text-align: center;">`;
            html += `      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="max-width: 100%; height: auto; font-family: sans-serif;">`;

            // Grid Y-Axis (Clinical HL 0-110, Inverted)
            for (let db = 0; db <= 110; db += 20) {
                const y = pad + (db / 110) * gH;
                html += `<line x1="${pad}" y1="${y}" x2="${width - pad}" y2="${y}" stroke="#f0f0f0" stroke-width="1" />`;
                html += `<text x="${pad - 8}" y="${y + 3}" font-size="8" fill="#bdc3c7" text-anchor="end">${db}</text>`;
            }

            // Grid X-Axis (Freqs)
            hpFreqs.forEach((f, i) => {
                const x = pad + (i / (hpFreqs.length - 1)) * gW;
                html += `<line x1="${x}" y1="${pad}" x2="${x}" y2="${height - pad}" stroke="#f0f0f0" stroke-width="1" />`;
                const label = f >= 1000 ? (f / 1000) + 'k' : f;
                html += `<text x="${x}" y="${height - pad + 12}" font-size="8" fill="#bdc3c7" text-anchor="middle">${label}</text>`;
            });

            // Plot Curves
            ['L', 'R'].forEach(side => {
                const isL = side === 'L';
                const color = isL ? '#42a5f5' : '#ef5350';
                const data = reportData.hearingProfile[side];
                if (!data || data.length === 0) return;

                let points = "";
                data.forEach((db, i) => {
                    const x = pad + (i / (hpFreqs.length - 1)) * gW;
                    const y = pad + (db / 110) * gH;
                    points += `${x},${y} `;
                });
                html += `<polyline points="${points}" fill="none" stroke="${color}" stroke-width="2" stroke-dasharray="${isL ? '4,2' : ''}" />`;

                data.forEach((db, i) => {
                    const x = pad + (i / (hpFreqs.length - 1)) * gW;
                    const y = pad + (db / 110) * gH;
                    if (isL) {
                        html += `<text x="${x}" y="${y + 3}" font-size="10" fill="${color}" text-anchor="middle" font-weight="bold">✕</text>`;
                    } else {
                        html += `<circle cx="${x}" cy="${y}" r="3" fill="none" stroke="${color}" stroke-width="1.5" />`;
                    }
                });
            });

            html += `      </svg>`;
            html += `      <div style="display: flex; justify-content: center; gap: 15px; font-size: 9px; color: #7f8c8d; margin-top: 5px;">
                        <div style="display: flex; align-items: center; gap: 4px;"><span style="color: #ef5350; font-weight: bold;">○</span> Right Ear</div>
                        <div style="display: flex; align-items: center; gap: 4px;"><span style="color: #42a5f5; font-weight: bold;">✕</span> Left Ear</div>
                      </div>`;
            html += `    </div>`;

            // Data Table
            html += `    <div style="flex: 1;">`;
            html += `      <table style="width: 100%; border-collapse: collapse; font-size: 9px; text-align: center;">
                        <thead><tr style="background: #f9f9f9;"><th style="padding: 4px; border: 1px solid #eee;">Hz</th><th style="padding: 4px; border: 1px solid #eee; color:#42a5f5;">L</th><th style="padding: 4px; border: 1px solid #eee; color:#ef5350;">R</th></tr></thead>
                        <tbody>`;
            hpFreqs.forEach((f, i) => {
                const lVal = reportData.hearingProfile.L[i] ?? '-';
                const rVal = reportData.hearingProfile.R[i] ?? '-';
                html += `<tr><td style="padding: 3px; border: 1px solid #eee; font-weight: bold;">${f}</td><td style="padding: 3px; border: 1px solid #eee;">${lVal}</td><td style="padding: 3px; border: 1px solid #eee;">${rVal}</td></tr>`;
            });
            html += `      </tbody></table>`;
            html += `    </div>`;

            html += `  </div>`;
            html += `</div>`;
        }

        if (reportData.aiSummary) {
            html += `<div style="background: #f9f9f9; border: 1px solid #ddd; padding: 20px; margin-bottom: 30px; border-radius: 4px; page-break-inside: avoid;">`;
            html += `  <h2 style="font-size: 12pt; color: #333; margin: 0 0 10px 0; text-transform: uppercase; font-weight: bold; border-bottom: 1px solid #ddd; padding-bottom: 5px;">Executive Clinical Summary</h2>`;
            html += `  <p style="margin: 0; font-size: 12pt; color: #1a1a1a; line-height: 1.6;">${reportData.aiSummary.replace(/\n/g, '<br>')}</p>`;
            html += `</div>`;
        }

        const sectionHeader = (title) => `<div style="page-break-inside: avoid; margin-bottom: 25px;"><h2 style="font-size: 14pt; color: #333; border-bottom: 1.5px solid #333; padding-bottom: 5px; margin: 35px 0 15px 0; text-transform: uppercase; letter-spacing: 0.5px; font-weight: bold;">${title}</h2>`;

        html += sectionHeader("Current Therapy Parameters");
        html += `<table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 14px;">`;
        let rowToggle = false;
        for (const [label, value] of Object.entries(reportData.settings)) {
            const rowBg = rowToggle ? '#f9f9f9' : '#fff';
            html += `<tr style="background: ${rowBg};"><td style="padding: 10px; border: 1px solid #ecf0f1; font-weight: 700; width: 40%; color: #1a1a1a;">${label}</td><td style="padding: 10px; border: 1px solid #ecf0f1;">${value}</td></tr>`;
            rowToggle = !rowToggle;
        }
        html += `</table></div>`;

        if (Object.keys(reportData.techSpecs).length > 0) {
            html += sectionHeader("System Specifications");
            html += `<table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 14px;">`;
            for (const [label, value] of Object.entries(reportData.techSpecs)) {
                html += `<tr><td style="padding: 10px; border: 1px solid #ecf0f1; font-weight: 700; width: 40%; color: #1a1a1a;">${label}</td><td style="padding: 10px; border: 1px solid #ecf0f1;">${value}</td></tr>`;
            }
            html += `</table></div>`;
        }

        html += `<div style="display: flex; gap: 20px; margin-bottom: 25px;">`;
        html += `  <div style="flex: 1; border: 1px solid #ecf0f1; padding: 15px; border-radius: 4px;">`;
        html += `    <p style="font-size: 11px; color: #95a5a6; margin: 0 0 5px 0; text-transform: uppercase;">Adherence</p>`;
        html += `    <p style="font-size: 18px; margin: 0; color: #2c3e50;"><b>${reportData.usage.todayMinutes}</b> <span style="font-size: 14px;">min today</span></p>`;
        html += `  </div>`;
        html += `  <div style="flex: 1; border: 1px solid #ecf0f1; padding: 15px; border-radius: 4px;">`;
        html += `    <p style="font-size: 11px; color: #95a5a6; margin: 0 0 5px 0; text-transform: uppercase;">Handicap (THI)</p>`;
        html += `    <p style="font-size: 18px; margin: 0; color: #2c3e50;"><b>${reportData.psychological.lastTHIScore}</b> <span style="font-size: 11px; color: #7f8c8d;">(as of ${reportData.psychological.lastTHIDate})</span></p>`;
        html += `  </div>`;
        html += `</div>`;

        // Visual Progress Chart (THI History)
        if (reportData.psychological.thiHistory && Object.keys(reportData.psychological.thiHistory).length > 1) {
            const history = Object.entries(reportData.psychological.thiHistory)
                .sort((a, b) => new Date(a[0]) - new Date(b[0]))
                .slice(-12);

            const width = 600;
            const height = 140;
            const padding = 35;
            const chartWidth = width - (padding * 2);
            const chartHeight = height - (padding * 2);

            let points = "";
            const step = chartWidth / (history.length - 1);

            history.forEach((entry, i) => {
                const x = padding + (i * step);
                const y = padding + (chartHeight - (entry[1] / 100 * chartHeight));
                points += `${x},${y} `;
            });

            html += `<div style="background: #fdfdfd; border: 1px solid #ecf0f1; border-radius: 4px; padding: 15px 15px 25px 15px; text-align: center; margin-bottom: 25px;">`;
            html += `  <p style="font-size: 11px; color: #95a5a6; margin: 0 0 15px 0; text-transform: uppercase; text-align: left;">Distress Trend (THI History)</p>`;
            html += `  <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="max-width: 100%; height: auto; font-family: sans-serif;" shape-rendering="geometricPrecision">`;
            [0, 25, 50, 75, 100].forEach(val => {
                const y = padding + (chartHeight - (val / 100 * chartHeight));
                html += `<line x1="${padding}" y1="${y}" x2="${width - padding}" y2="${y}" stroke="#f0f0f0" stroke-width="1" />`;
                html += `<text x="${padding - 8}" y="${y + 3}" font-size="9" fill="#bdc3c7" text-anchor="end">${val}</text>`;
            });
            html += `<polyline points="${points}" fill="none" stroke="#00bfa5" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" />`;
            history.forEach((entry, i) => {
                const x = padding + (i * step);
                const y = padding + (chartHeight - (entry[1] / 100 * chartHeight));
                html += `<circle cx="${x}" cy="${y}" r="3.5" fill="#fff" stroke="#00bfa5" stroke-width="2" />`;
                const dateStr = new Date(entry[0]).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                html += `<text x="${x}" y="${height - 5}" font-size="8" fill="#95a5a6" text-anchor="middle">${dateStr}</text>`;
            });
            html += `  </svg></div>`;
        }

        // Adherence Trend (30-Day Usage)
        if (reportData.usage.history && Object.keys(reportData.usage.history).length > 1) {
            const history = Object.entries(reportData.usage.history)
                .sort((a, b) => new Date(a[0]) - new Date(b[0]))
                .slice(-30);

            const width = 600;
            const height = 110;
            const padding = 35;
            const chartWidth = width - (padding * 2);
            const chartHeight = height - (padding * 2);

            const maxUsage = Math.max(60, ...history.map(e => e[1]));
            const barWidth = (chartWidth / history.length) * 0.7;
            const spacing = (chartWidth / history.length) * 0.3;

            html += `<div style="background: #fdfdfd; border: 1px solid #ecf0f1; border-radius: 4px; padding: 15px 15px 25px 15px; text-align: center; margin-bottom: 25px;">`;
            html += `  <p style="font-size: 11px; color: #95a5a6; margin: 0 0 15px 0; text-transform: uppercase; text-align: left;">Adherence Trend (Last 30 Days Usage)</p>`;
            html += `  <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="max-width: 100%; height: auto; font-family: sans-serif;" shape-rendering="geometricPrecision">`;

            [0, 0.5, 1].forEach(tick => {
                const val = Math.round(maxUsage * tick);
                const y = padding + (chartHeight - (tick * chartHeight));
                html += `<line x1="${padding}" y1="${y}" x2="${width - padding}" y2="${y}" stroke="#f0f0f0" stroke-width="1" />`;
                html += `<text x="${padding - 8}" y="${y + 3}" font-size="9" fill="#bdc3c7" text-anchor="end">${val}m</text>`;
            });

            history.forEach((entry, i) => {
                const h = (entry[1] / maxUsage) * chartHeight;
                const x = padding + (i * (barWidth + spacing));
                const y = padding + (chartHeight - h);
                html += `<rect x="${x}" y="${y}" width="${barWidth}" height="${h}" fill="#3498db" rx="1" />`;

                if (i === 0 || i === history.length - 1 || (history.length > 7 && i % Math.floor(history.length / 4) === 0)) {
                    const dateStr = new Date(entry[0]).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                    html += `<text x="${x + barWidth / 2}" y="${height - 5}" font-size="8" fill="#95a5a6" text-anchor="middle">${dateStr}</text>`;
                }
            });
            html += `  </svg></div>`;
        }

        html += sectionHeader("Clinical Metrics");
        html += `<div style="font-size: 14px; color: #34495e;">`;
        html += `  <p style="margin: 8px 0;"><b>Residual Inhibition (RI):</b> ${reportData.ri.latestRIResult}</p>`;
        html += `  <p style="margin: 8px 0;"><b>Min Masking Level (MML):</b> ${reportData.mml.latestMMLResult}</p>`;
        html += `  <p style="margin: 8px 0;"><b>Loudness Growth (LG):</b> ${reportData.lg.latestLGTest}</p>`;
        html += `  <p style="margin: 8px 0;"><b>TMC Q-Factor:</b> ${reportData.tmc.latestQFactor}</p>`;
        html += `</div></div>`;

        if (reportData.recommendations.length > 0) {
            html += sectionHeader("Protocol Adjustments");
            html += `<ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #34495e;">`;
            reportData.recommendations.forEach(r => {
                html += `<li style="margin-bottom: 8px;"><b>${r.mode}:</b> ${r.reason}</li>`;
            });
            html += `</ul></div>`;
        }

        html += sectionHeader("Technical Integrity Audit");
        html += `<div style="font-size: 12px; color: #7f8c8d; background: #fdfdfd; border: 1px solid #f0f0f0; padding: 15px; border-radius: 4px;">`;
        html += `  <p style="margin: 0 0 10px 0;"><b>Hardware Phase:</b> ${reportData.systemStatus.hardwarePhase}</p>`;
        html += `  <p style="margin: 0 0 10px 0;"><b>DSP Engine Status:</b> ${reportData.systemStatus.dspValidation}</p>`;
        html += `  <p style="margin: 0;"><b>Validation Summary:</b></p>`;
        html += `  <pre style="margin: 5px 0 0 0; white-space: pre-wrap; font-family: monospace; font-size: 11px;">${reportData.systemStatus.engineValidation}</pre>`;
        html += `</div></div>`;

        if (reportData.systemStatus.actionableRecommendations.length > 0) {
            html += `<div style="margin-top: 25px; padding: 15px; background: #fff5f5; border: 1px solid #feb2b2; border-radius: 4px;">`;
            html += `  <h3 style="color: #c53030; font-size: 13px; margin: 0 0 10px 0; text-transform: uppercase;">Required Technical Actions</h3>`;
            html += `  <ul style="margin: 0; padding-left: 20px; color: #c53030; font-size: 12px;">`;
            reportData.systemStatus.actionableRecommendations.forEach(rec => {
                html += `<li style="margin-bottom: 5px;">${rec}</li>`;
            });
            html += `  </ul>`;
            html += `</div>`;
        }

        if (reportData.psychological.thoughtRecordsCount > 0) {
            html += sectionHeader("Psychological Context (Last Record)");
            html += `<pre style="background: #fcfcfc; border: 1px solid #f0f0f0; padding: 15px; border-radius: 4px; font-family: sans-serif; font-size: 12px; color: #555; white-space: pre-wrap; line-height: 1.4;">${reportData.psychological.recentThoughtSummary}</pre></div>`;
        }

        // Signature Section
        html += `<div style="margin-top: 60px; display: flex; justify-content: space-between; page-break-inside: avoid;">`;
        html += `  <div style="width: 45%; border-top: 1.5px solid #333; padding-top: 8px;">`;
        html += `    <p style="font-size: 10px; margin: 0; color: #333; text-transform: uppercase; font-weight: bold;">Clinician Signature</p>`;
        html += `  </div>`;
        html += `  <div style="width: 45%; border-top: 1.5px solid #333; padding-top: 8px;">`;
        html += `    <p style="font-size: 10px; margin: 0; color: #333; text-transform: uppercase; font-weight: bold;">Review Date</p>`;
        html += `  </div>`;
        html += `</div>`;

        html += `<div style="margin-top: 60px; padding-top: 15px; border-top: 1px solid #eee; display: flex; justify-content: space-between; align-items: flex-start;">`;
        html += `  <div>`;
        html += `    <p style="font-size: 9px; color: #999; margin: 0;">Verified Clinical Assessment Tool | tinnitus.trahreg.com</p>`;
        html += `    <p style="font-size: 8px; color: #bbb; margin: 3px 0 0 0; font-style: italic;">Confidential Medical Document - For Professional Use Only</p>`;
        html += `  </div>`;
        html += `  <p style="font-size: 9px; color: #999; margin: 0;">Page 1 of 1</p>`;
        html += `</div>`;
        html += `</div>`;
        return html;
    }

    /**
     * Generates a comprehensive clinical report covering all modules.
     */
    async function generateGlobalClinicalReportPDF() {
        const reportData = getClinicalReportData("Global Progress Review", {}, {});
        const aiSummaryText = await getClinicalSummary();
        reportData.aiSummary = aiSummaryText;
        const htmlContent = generateClinicalReportHtml(reportData);

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;
        document.body.appendChild(tempDiv);

        const isAlreadyLightMode = document.documentElement.classList.contains('light-mode');
        if (!isAlreadyLightMode) document.documentElement.classList.add('light-mode');

        const opt = {
            margin: [20, 15], filename: 'tinnitus_global_progress_report.pdf', image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', scrollY: 0 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        await html2pdf().set(opt).from(tempDiv).save();

        if (!isAlreadyLightMode) document.documentElement.classList.remove('light-mode');
        document.body.removeChild(tempDiv);
    }

    /**
     * Generates a celebratory achievement certificate for users reaching Full Habituation.
     */
    async function generateMilestoneCertificatePDF() {
        const progress = getMilestoneProgress();
        const today = new Date().toLocaleDateString();

        const html = `
        <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 50px; text-align: center; border: 15px double #00bfa5; background: #fff; color: #1a1a1a; width: 10in; height: 7.5in; margin: auto; box-sizing: border-box; display: flex; flex-direction: column; justify-content: center; position: relative;">
            <div style="position: absolute; top: 20px; right: 20px; font-size: 40pt; opacity: 0.1;">🏆</div>
            <h1 style="font-size: 42pt; color: #00897b; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 2px; font-weight: bold;">Certificate of Achievement</h1>
            <h2 style="font-size: 24pt; color: #333; margin: 0 0 40px 0; font-weight: normal;">Tinnitus Habituation Milestone</h2>
            <p style="font-size: 18pt; margin: 0 0 10px 0;">This clinical record certifies that</p>
            <h3 style="font-size: 32pt; border-bottom: 2px solid #333; display: inline-block; padding: 0 40px 10px 40px; margin: 10px 0 30px 0; font-style: italic;">Auditory Retraining Participant</h3>
            <p style="font-size: 16pt; line-height: 1.6; max-width: 80%; margin: auto; color: #444;">
                has successfully navigated the six clinical stages of habituation using the 
                <strong>Trahreg Tinnitus Therapy Suite</strong>, successfully reaching the definitive stage of
            </p>
            <h4 style="font-size: 28pt; color: #00bfa5; margin: 25px 0 40px 0; font-weight: bold;">Phase 6: Full Habituation</h4>
            <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 40px; padding: 0 80px;">
                <div style="text-align: left;">
                    <p style="margin: 0; font-size: 12pt; color: #7f8c8d; text-transform: uppercase; letter-spacing: 1px;">Completion Date</p>
                    <p style="margin: 5px 0 0 0; font-size: 16pt; font-weight: bold; color: #2c3e50;">${today}</p>
                </div>
                <div style="text-align: right;">
                    <p style="margin: 0; font-size: 12pt; color: #7f8c8d; text-transform: uppercase; letter-spacing: 1px;">Protocol Version</p>
                    <p style="margin: 5px 0 0 0; font-size: 16pt; font-weight: bold; color: #2c3e50;">Suite v${APP_VERSION}</p>
                </div>
            </div>
            <p style="font-size: 9pt; color: #bdc3c7; margin-top: 60px;">tinnitus.trahreg.com | Open-Source Auditory Research & Habituation Platform</p>
        </div>
    `;

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        document.body.appendChild(tempDiv);

        const opt = {
            margin: 0, filename: 'tinnitus_habituation_achievement.pdf', image: { type: 'jpeg', quality: 1.0 },
            html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
            jsPDF: { unit: 'in', format: 'letter', orientation: 'landscape' }
        };

        try {
            await html2pdf().set(opt).from(tempDiv).save();
        } finally {
            document.body.removeChild(tempDiv);
        }
    }

    /**
     * Generates personalized therapy recommendations based on THI and MML scores.
     */
    function getTherapyRecommendations() {
        const latestTHI = getLatestLogData('distress_log');
        const thiScore = latestTHI ? latestTHI.data : null;

        const targetFreq = parseFloat(loadSetting('notchL', loadSetting('toneFreqL', loadSetting('cr_baseFreq', 6000))));

        const latestMML = getLatestLogData('mml_log');
        const lastMMLValue = (latestMML && Array.isArray(latestMML.data))
            ? latestMML.data.slice(-1)[0]
            : (latestMML ? latestMML.data : null);

        const latestQF = getLatestLogData('q_factor_log');
        const lastQFactor = (latestQF && latestQF.data) ? latestQF.data : null;

        if (thiScore === null) {
            return { status: 'incomplete', message: 'Please complete the THI Assessment in CBT & Wellness to get personalized recommendations.' };
        }

        const recs = [];
        const reportsSleepIssues = loadSetting('reports_sleep_issues', 'false') === 'true';

        // 1. Psychological Priority (High Distress / Spikes)
        if (thiScore >= 58) { // Severe or Catastrophic
            recs.push({
                mode: "CBT & Wellness",
                url: "cbt.html",
                reason: "Your score indicates significant handicap. Prioritizing psychological tools and relaxation is the most effective clinical path during high-distress phases."
            });
        }

        // 2. Neuromodulation Strategy (Moderate and Above)
        if (thiScore >= 38) {
            if (lastQFactor !== null && lastQFactor > 2.5) {
                recs.push({
                    mode: "CR Neuromodulation",
                    url: "cr.html",
                    reason: "Because your tinnitus is highly tonal (High Q-factor), Acoustic CR is recommended to disrupt specific neural synchrony."
                });
            }
            recs.push({
                mode: "Dual-Stimulus",
                url: "lenire.html",
                reason: "Bimodal stimulation is suggested for moderate symptoms to engage multiple sensory pathways for neuroplastic change."
            });
        }

        // 3. Notch Therapy (Mild-Moderate Tonal)
        if (thiScore < 58 && (lastQFactor === null || lastQFactor > 1.5)) {
            recs.push({
                mode: "Notch Therapy",
                url: "notch.html",
                reason: "Targeted energy removal is effective for tonal tinnitus when distress levels are managed, encouraging lateral inhibition."
            });
        }

        // 4. Sound Enrichment & Decorrelation
        if (lastMMLValue !== null && lastMMLValue > 50 || (lastQFactor !== null && lastQFactor <= 1.5)) {
            recs.push({
                mode: "Decorrelated Noise",
                url: "decorrelated.html",
                reason: "For noise-like tinnitus or high masking thresholds, decorrelated signals provide superior relief by widening the soundstage."
            });
        } else {
            let bbReason = "For mid-range frequencies, Broadband Sound Therapy using Pink noise (Rain) is the clinical standard for habituation.";
            if (targetFreq > 10000) bbReason = "For ultra-high frequency tones (>10kHz), Broadband Sound Therapy using Violet noise is specifically recommended to provide sufficient energy in the highest audible range.";
            else if (targetFreq > 6000) bbReason = "For high-frequency tones, Broadband Sound Therapy with Blue noise provides targeted stimulation to help your brain habituate more effectively.";
            else if (targetFreq < 1200) bbReason = "For low-frequency roaring or humming, Broadband Sound Therapy with Brown noise (Ocean) provides deep spectral coverage for effective habituation.";

            recs.push({
                mode: "Broadband Sound Therapy",
                url: "soundtherapy.html",
                reason: bbReason
            });
        }

        // 5. Wellness & Sleep Support
        if (reportsSleepIssues || thiScore < 38) {
            recs.push({
                mode: "Binaural Beats",
                url: "binaural.html",
                reason: reportsSleepIssues
                    ? "Delta-wave entrainment can help bypass auditory focus and facilitate the transition into restorative sleep."
                    : "Binaural relaxation tools help maintain low autonomic arousal, preventing future stress spikes."
            });
        }

        return { status: 'complete', thi: thiScore, mml: lastMMLValue, qFactor: lastQFactor, recommendations: recs };
    }

    /**
     * Generates a BBCode/Markdown summary of the current setup for community sharing.
     */
    function shareSetup(modeName, reportData) {
        const validation = getUnifiedValidationStatus();
        const thi = getLatestLogData('distress_log');

        let text = `[b]Trahreg Tinnitus Suite - ${modeName} Setup[/b]\n`;
        text += `[i]Mode: ${modeName}[/i]\n\n`;

        for (const [key, val] of Object.entries(reportData)) {
            text += `* ${key}: ${val}\n`;
        }

        if (thi) text += `\n[b]Latest THI Score:[/b] ${thi.data}/100 (${new Date(thi.date).toLocaleDateString()})\n`;
        text += `[b]System Validation:[/b] ${validation.isValid ? "Verified" : "Pending"}\n\n`;
        text += `Generated via Trahreg Tinnitus Therapy Suite (v${APP_VERSION})\n`;
        text += `[url]https://tinnitus.trahreg.com[/url]\n`;
        text += `[url]https://github.com/5310H/tinnitus_therapy[/url]`;

        navigator.clipboard.writeText(text).then(() => {
            alert("Setup summary copied to clipboard in BBCode (Tinnitus Talk) and Markdown (Reddit) format. You can now paste it into a forum post!");
        }).catch(err => {
            console.error("Clipboard error:", err);
            alert("Could not copy automatically. Please check the browser console for your share text.");
            console.log(text);
        });
    }

    /** Global compatibility wrappers */
    function initAI() { tinnitusAI.init(); }
    async function performGeminiTest() { return await tinnitusAI.performTest(); }
    async function fetchAIAssistance(t, p) { return await tinnitusAI.fetchAIAssistance(t, p); }
    async function getBalancedThoughtSuggestion(th) { return await tinnitusAI.getBalancedThoughtSuggestion(th); }
    async function getSOSSupport(i) { return await tinnitusAI.getSOSSupport(i); }
    async function getSoundRecipe(d) { return await tinnitusAI.getSoundRecipe(d); }
    async function getPatternAnalysis(q) { return await tinnitusAI.getPatternAnalysis(q); }
    async function getTRTExplanation(q) { return await tinnitusAI.getTRTExplanation(q); }
    async function getClinicalSummary() { return await tinnitusAI.getClinicalSummary(); }
    async function getDailyMotivation() { return await tinnitusAI.getDailyMotivation(); }
    async function getEnvironmentalAdvice(db, s) { return await tinnitusAI.getEnvironmentalAdvice(db, s); }
    async function getMindfulnessScript(th) { return await tinnitusAI.getMindfulnessScript(th); }
    async function getHabituationForecast() { return await tinnitusAI.getHabituationForecast(); }
    async function getPersonalizedInsights() { return await tinnitusAI.getPersonalizedInsights(); }

    function getRIResults() { return getJson('ri_log', {}); }
    function getMMLResults() { return getJson('mml_log', {}); }
    function getLoudnessGrowthLog() { return getJson('lg_log', {}); }
    function getQFactors() { return getJson('q_factor_log', {}); }
    function getTMCLog() { return getJson('tmc_log', {}); }
    function clearTMCLog() { localStorage.removeItem('tts_tmc_log'); }

    /**
     * Retrieves the date of the most recent Tinnitus Handicap Inventory (THI) assessment.
     * @returns {Date|null} The Date object of the last assessment, or null if none found.
     */
    function getLastTHIAssessmentDate() {
        const latest = getLatestLogData('distress_log');
        return latest ? new Date(latest.date) : null;
    }

    /**
     * Retrieves the date of the most recent Hearing Profile (Audiogram) entry.
     */
    function getLastHearingTestDate() {
        const d = loadSetting('last_hearing_test_date', null);
        return d ? new Date(d) : null;
    }

    // Initialize the AI manager globally, but only after the DOM is ready
    const tinnitusAI = new TinnitusAIManager();

    /**
     * Updates the System & Clinical Hub UI elements on the dashboard.
     */
    function updateSettingsInsights() {
        const audit = getPrivacyAudit();
        const habit = getMilestoneProgress();

        const elHabit = document.getElementById('settingsHabitProgress');
        if (elHabit) elHabit.textContent = habit.percentage + '%';

        const elStorage = document.getElementById('settingsStorageUsed');
        if (elStorage) elStorage.textContent = audit.storageUsedKB + ' KB';

        const elAiModel = document.getElementById('settingsAiModel');
        if (elAiModel) elAiModel.textContent = tinnitusAI.modelName || (audit.isAIConfigured ? 'Ready' : 'None');

        const elEngine = document.getElementById('settingsEngineStatus');
        if (elEngine) {
            elEngine.textContent = window.audioCtx ? (window.audioCtx.state === 'running' ? 'Active' : 'Suspended') : 'Offline';
        }
    }

    /** Startup Synchronization **/
    setTimeout(() => {
        const sdkPresent = tinnitusAI._getSDK();
        console.log(`[TTS] Persistence Engine v${APP_VERSION} initialized.`);
        console.log(`[TTS] AI SDK Detection: ${sdkPresent ? "✅ Detected" : "❌ Missing (Check Script Loading)"}`);
    }, 1500);

    /**
     * Generic "Video-Style" Walkthrough System
     */
    function showWalkthrough(slides, startIndex = 0) {
        let currentSlide = startIndex;
        let autoPlayTimer = null;
        let isAutoPlaying = false;
        let speechSynth = window.speechSynthesis;
        let speechUtterance = null;
        let narratorEnabled = loadSetting('narrator_enabled', 'false') === 'true'; // Load preference
        let narratorSpeed = parseFloat(loadSetting('narrator_speed', '0.9'));
        let narratorVolume = parseFloat(loadSetting('narrator_volume', '1.0'));

        // Ensure only one walkthrough is active at a time
        const existing = document.getElementById('walkthroughModal');
        if (existing) existing.remove();

        document.body.classList.add('tutorial-active');

        const closeWalkthrough = () => {
            document.body.classList.remove('tutorial-active');
            stopAuto();
            clearHighlights();
            const el = document.getElementById('walkthroughModal');
            if (el) el.remove();

            // Return to onboarding if we were in the middle of step 3 (System Guidance)
            const step = parseInt(loadSetting('onboarding_step', '0'));
            if (step === 3 && typeof window.showOnboardingModal === 'function') {
                window.showOnboardingModal();
            }
        };
        window.closeWalkthrough = closeWalkthrough;

        const clearHighlights = () => {
            document.querySelectorAll('.tutorial-highlight').forEach(el => el.classList.remove('tutorial-highlight'));
        };

        const stopSpeaking = () => {
            if (speechSynth && speechSynth.speaking) {
                speechSynth.cancel();
            }
        };

        const getPlainTextFromHtml = (html) => {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;
            return tempDiv.textContent || tempDiv.innerText || '';
        };

        const speakContent = (title, contentHtml) => {
            stopSpeaking();
            if (narratorEnabled && speechSynth) {
                const voices = speechSynth.getVoices();
                const textToSpeak = title + ". " + getPlainTextFromHtml(contentHtml);
                speechUtterance = new SpeechSynthesisUtterance(textToSpeak);
                speechUtterance.rate = narratorSpeed;
                speechUtterance.pitch = 1;
                speechUtterance.volume = narratorVolume;

                // Prioritize professional male voices (Neural/Natural/specific professional names)
                const maleKeywords = ['natural', 'neural', 'google us english male', 'microsoft david', 'daniel', 'david', 'alex', 'james', 'male'];
                const selectedVoice = voices
                    .filter(v => v.lang.startsWith('en') && maleKeywords.some(k => v.name.toLowerCase().includes(k)))
                    .sort((a, b) => {
                        // Prioritize high-quality "Natural" or "Neural" voices for a professional sound
                        const aName = a.name.toLowerCase();
                        const bName = b.name.toLowerCase();
                        const aQuality = aName.includes('natural') || aName.includes('neural');
                        const bQuality = bName.includes('natural') || bName.includes('neural');
                        return bQuality - aQuality;
                    })[0];

                if (selectedVoice) speechUtterance.voice = selectedVoice;

                // Chained auto-advance: move to next slide after speech ends
                if (isAutoPlaying) {
                    speechUtterance.onend = () => {
                        if (isAutoPlaying) {
                            autoPlayTimer = setTimeout(() => {
                                if (currentSlide < slides.length - 1) { currentSlide++; update(); }
                                else stopAuto();
                            }, 1500); // Brief pause after speaking
                        }
                    };
                }

                speechSynth.speak(speechUtterance);
            }
        };

        const modalHTML = `
        <div id="walkthroughModal" class="modal-overlay" style="display:block; background: transparent; backdrop-filter: none; pointer-events: none; z-index: 10200;">
            <div id="walkthroughCard" class="modal-card tutorial-mode" style="text-align: center; pointer-events: auto;">
                <div id="wProgress" style="display:flex; gap:5px; margin-bottom:20px; justify-content:center;"></div>
                <h2 id="wTitle" style="color:var(--accent); margin-top:0; font-size: 1.4rem;"></h2>
                <div id="wContent" style="margin: 20px 0; line-height:1.6; min-height:120px; font-size:0.95rem;"></div>
                <div style="display:flex; gap:10px;">
                    <button id="wBack" class="button" style="flex:1;">Back</button>
                    <button id="wNext" class="big-btn play-btn" style="flex:2; margin-top:0;"></button>
                </div>
                <div style="display:flex; justify-content: space-between; align-items: center; margin-top: 15px; flex-wrap: wrap; gap: 10px;">
                    <div style="display:flex; align-items: center; gap: 12px;">
                        <label style="display: flex; align-items: center; gap: 5px; cursor: pointer; font-size: 0.8rem; color: var(--text-dim);">
                            <input type="checkbox" id="narratorToggle" style="width: 16px; height: 16px;">
                            <span>Narrator</span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 5px; font-size: 0.8rem; color: var(--text-dim);">
                            <input type="range" id="narratorSpeed" min="0.5" max="2.0" step="0.1" style="width: 50px; height: 4px; accent-color: var(--accent);">
                            <span id="speedValLabel"></span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 5px; font-size: 0.8rem; color: var(--text-dim);" title="Narrator Volume">
                            <span style="font-size: 0.7rem;">🔊</span>
                            <input type="range" id="narratorVolume" min="0" max="1" step="0.1" style="width: 50px; height: 4px; accent-color: var(--accent);">
                        </label>
                    </div>
                    <div style="display:flex; gap: 5px;">
                        <button id="wAuto" class="button" style="border:none; color:var(--accent); font-size:0.8rem; padding: 5px;">▶ Auto-Play</button>
                        <button onclick="closeWalkthrough()" class="button" style="border:none; color:var(--text-dim); font-size:0.8rem; padding: 5px;">Close Guide</button>
                    </div>
                </div>
            </div>
        </div>
    `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        try {
            // Set initial state of narrator toggle
            document.getElementById('narratorToggle').checked = narratorEnabled;
            document.getElementById('narratorToggle').onchange = (e) => {
                narratorEnabled = e.target.checked;
                saveSetting('narrator_enabled', narratorEnabled);
                if (!narratorEnabled) stopSpeaking();
            };

            // Set initial state of speed slider
            const speedSlider = document.getElementById('narratorSpeed');
            const speedLabel = document.getElementById('speedValLabel');
            speedSlider.value = narratorSpeed;
            speedLabel.textContent = narratorSpeed.toFixed(1) + 'x';
            speedSlider.oninput = (e) => {
                narratorSpeed = parseFloat(e.target.value);
                speedLabel.textContent = narratorSpeed.toFixed(1) + 'x';
                saveSetting('narrator_speed', narratorSpeed);
            };

            // Set initial state of volume slider
            const volumeSlider = document.getElementById('narratorVolume');
            volumeSlider.value = narratorVolume;
            volumeSlider.oninput = (e) => {
                narratorVolume = parseFloat(e.target.value);
                saveSetting('narrator_volume', narratorVolume);
            };
        } catch (err) {
            console.warn("Tutorial UI failed to initialize:", err);
            closeWalkthrough();
            return;
        }

        const stopAuto = () => { // This function also stops speaking
            if (autoPlayTimer) {
                clearTimeout(autoPlayTimer);
                autoPlayTimer = null;
            }
            isAutoPlaying = false;
            document.getElementById('wAuto').textContent = "▶ Auto-Play";
            stopSpeaking();
        };

        const update = () => {
            if (!slides || !slides[currentSlide]) return closeWalkthrough();

            clearHighlights();
            const s = slides[currentSlide];
            if (document.getElementById('wTitle')) document.getElementById('wTitle').textContent = s.title;
            document.getElementById('wContent').innerHTML = s.content;
            document.getElementById('wNext').textContent = currentSlide === slides.length - 1 ? "Finish" : "Next";
            document.getElementById('wBack').style.visibility = currentSlide > 0 ? 'visible' : 'hidden';
            document.getElementById('wProgress').innerHTML = slides.map((_, i) => `<div style="width:20px; height:4px; border-radius:2px; background:${i <= currentSlide ? 'var(--accent)' : 'var(--surface)'}"></div>`).join('');

            if (s.selector) {
                const target = document.querySelector(s.selector);
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    target.classList.add('tutorial-highlight');
                }
            }

            // Speak content if auto-playing and narrator is enabled
            if (narratorEnabled) {
                speakContent(s.title, s.content);
            } else {
                stopSpeaking(); // Ensure speech stops if not auto-playing or narrator disabled
                // If auto-playing but narrator is off, we need a standard timer to advance
                if (isAutoPlaying) {
                    autoPlayTimer = setTimeout(() => {
                        if (currentSlide < slides.length - 1) { currentSlide++; update(); }
                        else stopAuto();
                    }, 7000); // Standard slide duration
                }
            }
        };

        document.getElementById('wNext').onclick = () => {
            stopAuto();
            if (currentSlide < slides.length - 1) { currentSlide++; update(); }
            else closeWalkthrough();
        };
        document.getElementById('wBack').onclick = () => { stopAuto(); if (currentSlide > 0) { currentSlide--; update(); } };

        document.getElementById('wAuto').onclick = () => {
            if (isAutoPlaying) {
                stopAuto();
            } else {
                isAutoPlaying = true;
                document.getElementById('wAuto').textContent = "⏸ Paused";
                update();
            }
        };

        update();
    }

    /**
     * Displays a summary of updates for the current version.
     * Unifies the dashboard modal and the multi-module walkthrough logic.
     */
    async function showWhatsNew() {
        let highlights = [];
        try {
            const isDocs = window.location.pathname.toLowerCase().includes('/docs/');
            const configPath = (isDocs ? '../whats_new.json' : 'whats_new.json') + '?v=' + APP_VERSION;

            const response = await fetch(configPath);
            if (response.ok) highlights = await response.json();
        } catch (e) {
            console.warn("TTS: Could not dynamically load version highlights.", e);
        }

        const modal = document.getElementById('whatsNewModal');
        const container = document.getElementById('dynamicWhatsNew');

        if (modal && container) {
            // Dashboard Modal Logic
            let html = "";
            if (window.REMOTE_CONFIG && window.REMOTE_CONFIG.whatsNew) {
                html += `<h3 style="color: var(--accent); font-size: 1rem; margin-bottom: 10px;">Latest Update (v${window.REMOTE_CONFIG.version})</h3>`;
                html += `<ul style="padding-left: 20px; line-height: 1.6; margin-bottom: 20px; font-size: 0.9rem; color: var(--text-dim);">`;
                window.REMOTE_CONFIG.whatsNew.forEach(item => { html += `<li>${item}</li>`; });
                html += `</ul>`;
            }

            highlights.forEach(item => {
                html += `<h3 style="color: var(--accent); font-size: 1rem; margin-bottom: 10px; border-top: 1px dashed var(--border); padding-top: 10px;">${item.title}</h3>`;
                if (item.content.trim().startsWith('<')) {
                    html += item.content;
                } else {
                    html += `<p style="line-height: 1.6; margin-bottom: 20px; font-size: 0.9rem; color: var(--text-dim);">${item.content}</p>`;
                }
            });
            container.innerHTML = html;
            modal.style.display = 'block';
        } else if (highlights.length > 0) {
            // Interactive Walkthrough View: Prioritize slides matching current version
            const slides = highlights.filter(h => h.title.includes(APP_VERSION));
            showWalkthrough(slides.length ? slides : highlights.slice(0, 3));
        }
    }

    const closeWhatsNew = () => {
        saveSetting('last_seen_version', APP_VERSION);
        const modal = document.getElementById('whatsNewModal');
        if (modal) modal.style.display = 'none';
        if (typeof needsValidation === 'function' && needsValidation()) {
            const vBtn = document.getElementById('validationBtn');
            if (vBtn) vBtn.classList.add('highlight-btn');
        }
        const btn = document.getElementById('whatsNewBtn');
        if (btn) btn.style.display = 'none';
    };

    // Global Keyboard Support for Modal Dismissal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const whatsNew = document.getElementById('whatsNewModal');
            if (whatsNew && whatsNew.style.display === 'block') closeWhatsNew();
        }
    });

    function showQuickStartGuide() {
        showWalkthrough([
            { title: "Welcome to Relief", content: "Tinnitus management is a journey of training the brain. This suite provides the tools research shows are most effective for 'habituation'." },
            { title: "The Golden Rule: Mixing", content: "<b>Important:</b> Do not hide your tinnitus completely. Set your therapy volume so the sound and your tinnitus 'mix'. Your brain needs to hear both to learn the tinnitus is neutral." },
            { title: "Step 1: Calibration", content: "Visit the <b>Notch Finder</b> first. You must find your exact tinnitus pitch so therapies can target the correct neural clusters." },
            { title: "Step 2: Passive Listening", content: "Use therapy for 30–60 minutes daily. Don't focus on it—let it be background 'wallpaper' while you work or relax." },
            { title: "Step 3: Reports & AI", content: "Review your progress monthly using the <b>Clinical Report</b>. If you feel stuck, use the <b>AI Insights</b> tool to identify patterns and triggers." }
        ]);
    }

    /**
     * Starts a module-specific tutorial walkthrough.
     */
    function startModuleTutorial(key, startIndex = 0) {
        const tutorials = {
            'decorrelated': [
                { title: "Hardware Check", content: "Plug in your headphones. This therapy depends on your brain receiving two different, independent signals.", selector: "h1" },
                { title: "Sound Source", content: "Select your preferred noise color or nature sound. Pink noise is often most comfortable for long sessions.", selector: "#color" },
                { title: "EQ Setup", content: "Use the EQ sliders to boost frequencies where you have hearing loss. This reduces the 'listening effort' required by your brain.", selector: "#eqSection" },
                { title: "The Mixing Point", content: "Adjust the volume so the noise and your tinnitus 'mix'. Do not mask the sound completely.", selector: "#volMaster" },
                { title: "Start Session", content: "Set your timer and begin your daily therapy session.", selector: "#toggleBtn" },
                { title: "Share Your Setup", content: "Found a configuration that provides relief? Share it with the community to help others find their mixing point.", selector: "button[onclick='shareToCommunity()']" }
            ],
            'notch': [
                { title: "Pitch Match", content: "Use the test tone to find your exact tinnitus pitch. Precision is critical for effective Notch therapy.", selector: "#step1Section" },
                { title: "Set the Notch", content: "Input your matched frequency here. This 'silences' the noise in that specific frequency range.", selector: "#step2Section" },
                { title: "Notch Width", content: "Set the width to 1.0 octaves (clinical standard). This determines the size of the 'hole' in the noise.", selector: "#step2Section" },
                { title: "Volume Mix", content: "Adjust volume to the mixing point. You should still hear your tinnitus inside the notch.", selector: "#volMaster" },
                { title: "Start Therapy", content: "Activate the engine to begin the cortical reorganization process.", selector: "#toggleBtn" },
                { title: "Share Your Setup", content: "Sharing your matched frequency and volume levels helps others understand how to calibrate their own notch therapy.", selector: "button[onclick='shareToCommunity()']" }
            ],
            'cr': [
                { title: "Precise Bracketing", content: "Use this tone to exactly match your tinnitus pitch. This determines the 4 therapeutic frequencies.", selector: ".card:first-of-type" },
                { title: "Tone Calculation", content: "Once matched, click here to calculate your personalized therapy sequence.", selector: "#baseFreq" },
                { title: "Perceived Loudness", content: "Adjust these sliders until all four tones sound equally loud to you. Balance is vital for success.", selector: ".bal-slider-row" },
                { title: "Volume & Timing", content: "Set your session time (60 mins recommended) and start the coordinated reset sequence.", selector: "#toggleBtn" },
                { title: "Share Your Setup", content: "Acoustic CR is complex; sharing your bracketing results can help the community refine their own sequences.", selector: "button[onclick='shareToCommunity()']" }
            ],
            'lenire': [
                { title: "Neuromodulation", content: "This engine uses bursts and modulated noise to drive auditory neuroplasticity.", selector: "h1" },
                { title: "Visual Sync", content: "Enable the visual pulse to add multisensory input, which can enhance the therapeutic effect.", selector: "#visualPulse" },
                { title: "Tactile Bimodal Setup", content: "If using a smartphone, enable Haptic Pulse. The phone will vibrate in sync with the sound bursts, providing a safe, tactile 'second sense' to help your brain re-focus away from tinnitus.", selector: "#hapticPulse" },
                { title: "Intensity Control", content: "Adjust the Vibration Intensity to find a level that is noticeable but not distracting. A gentle tap synchronized with the sound is usually most effective.", selector: "#hapticStrengthCtrl" },
                { title: "Trigger Calibration", content: "Adjust Trigger Sensitivity until the device pulses only when you hear a tone burst. If it vibrates constantly, increase the value. If it misses bursts, decrease it.", selector: "#hapticSensCtrl" },
                { title: "Auditory Pacer", content: "Enable Auditory Cues to hear a subtle chime at the start of each breath. This allows you to maintain synchronization even with your eyes closed.", selector: "#pacerAudio" },
                { title: "Pulse Rate", content: "Adjust the pulse speed to match your natural resting breath. A slow, steady rhythm (around 5-6 breaths per minute) is usually best for relaxation.", selector: "#pulseRate" },
                { title: "Breathing Sync", content: "Try to match your breathing to the visual pulse. Inhaling as the light expands and exhaling as it fades helps activate the body's relaxation response, further aiding habituation.", selector: "#visualPulse" },
                { title: "The Mix", content: "Balance the tones and noise so neither is overwhelming. The sound should shimmer in the background.", selector: "#mixL" },
                { title: "Help the Community", content: "Found a setup that works for you? Use the 'Share Setup' button to generate a summary you can post on forums like Tinnitus Talk or Reddit. Helping others find relief is the best way to grow this project!", selector: "button[onclick='shareToCommunity()']" }
            ],
            'soundtherapy': [
                { title: "Sound Types", content: "Choose between calibrated broadband noise for habituation or nature sounds for relaxation.", selector: ".btn-grid:first-of-type" },
                { title: "Breathing Pacer", content: "Use the 4-7-8 pacer to lower physiological stress during a tinnitus spike.", selector: "#pacerToggle" },
                { title: "Volume Calibration", content: "Set to the 'Mixing Point'. If you hide the tinnitus completely, you aren't habituating.", selector: "#volume" },
                { title: "Sleep Support", content: "Enable Sleep Fade for a soft 60-second shutdown when the timer ends.", selector: "#sleepMode" },
                { title: "Share Your Setup", content: "Share your favorite soundscapes and masking levels with the community.", selector: "button[onclick='shareToCommunity()']" }
            ],
            'notchfinder': [
                { title: "Frequency Input", content: "Adjust the pitch using the slider or type a value. This identifies your tinnitus 'center frequency'.", selector: ".responsive-grid" },
                { title: "First-Time Calibration Checklist", content: "To avoid <b>Octave Confusion</b>: 1. Find your match. 2. Double the frequency; if it sounds closer to your tinnitus, your original was too low. 3. Half the frequency; if it sounds like a deeper version of your tinnitus, your original was too high. The fundamental (lowest) clear match is your target.", selector: ".responsive-grid" },
                { title: "Auto-Sweep", content: "Use this to slowly climb the frequency range. It's often easier to find the match while the sound is moving.", selector: "#speedSlider" },
                { title: "Test & Listen", content: "Toggle the tones to compare the external sound against your internal tinnitus.", selector: "#playBtn" },
                { title: "Save Settings", content: "Once matched, save here. This frequency will be used across all other therapy modules automatically.", selector: "#saveBtn" },
                { title: "Matching Difficulty?", content: "If you cannot find a match, you may have hearing loss in that frequency region. Use the <b>Hearing Test</b> tool to check your audibility levels.", selector: "h1" }
            ],
            'tmc': [
                { title: "Tinnitus Masking Curve", content: "The TMC maps your auditory filter shape by measuring the Minimum Masking Level (MML) at multiple frequencies. This helps determine if your tinnitus is tonal or noise-like.", selector: "h1" },
                { title: "Frequency Selection", content: "Select a frequency to test. We recommend testing frequencies above and below your matched tinnitus pitch to see the shape of the filter.", selector: "#freqSlider" },
                { title: "Volume Calibration", content: "Adjust the volume until the tone just barely masks your tinnitus. This is your Minimum Masking Level for this specific frequency.", selector: "#volSlider" },
                { title: "Recording Data", content: "Click 'Save Point' to add this measurement to your chart. You should collect at least 5-7 points across the spectrum for an accurate curve.", selector: "button[onclick='savePoint()']" },
                { title: "Quick Start", content: "If you have already matched your pitch in the Notch Finder, you can import it here to set your baseline center frequency.", selector: "button[onclick='importNotchFreq()']" },
                { title: "Tuning Reference", content: "Enable the Reference Overlay to compare your curve against a standard clinical auditory filter. A steeper curve indicates higher 'tonality' (High Q-factor).", selector: "#showRef" },
                { title: "Therapy Alignment", content: "Show the Notch Region to see how your current Notch Therapy settings align with the peak of your masking curve.", selector: "#showNotch" },
                { title: "Q-factor Interpretation", content: "The calculated Q-factor represents the sharpness of your tinnitus 'signature'. This value is used by the suite to provide personalized therapy recommendations.", selector: "#qFactorDisplay" }
            ],
            'lg': [
                { title: "Loudness Growth Test", content: "This test maps your subjective perception of loudness against objective volume increases. It is used to identify hyperacusis (sound sensitivity) and auditory recruitment.", selector: "h1" },
                { title: "Frequency Selection", content: "Choose a frequency to test. Testing at 1kHz is standard, but you should also test frequencies where you feel most sensitive.", selector: "#freqSlider" },
                { title: "Volume Safety", content: "Start with the volume at 0% or a very low level. You will gradually increase this to find your thresholds.", selector: "#volSlider" },
                { title: "Activating the Tone", content: "Click 'Start Tone' to begin the test. You can adjust frequency and volume in real-time while the tone is active.", selector: "#toggleBtn" },
                { title: "Rating Your Perception", content: "For each volume level, click the button that matches how loud the sound feels. Each click saves a point and updates your growth curve.", selector: ".btn-grid" },
                { title: "Understanding the Curve", content: "The chart plots your subjective ratings. A 'normal' response is a gradual slope. A very steep slope indicates that loudness perception is growing too quickly.", selector: "#lgChart" },
                { title: "Clinical Significance", content: "Clinicians use these curves to track 'Loudness Discomfort Levels' (LDLs). Improvement is shown when the curve becomes flatter over time.", selector: "#lgChart" },
                { title: "Exporting Results", content: "Generate a PDF or text report once you have completed your mapping. This objective data is crucial for professional clinical review.", selector: ".zen-keep" }
            ],
            'ri': [
                { title: "Suppression Setup", content: "Choose a noise color. We will play this for 60 seconds at a level that completely hides your tinnitus.", selector: "#noiseColor" },
                { title: "The Stopwatch", content: "After the noise stops, time how long it takes for your tinnitus to return to its normal level.", selector: "#step3" },
                { title: "History", content: "Track your RI duration over time. Longer suppression periods are a positive clinical sign.", selector: "#riHistory" }
            ],
            'validation': [
                { title: "Phase Verification", content: "This is critical. Ensure the 'In-Phase' tone sounds centered in your head, not 'wide' or hollow.", selector: ".card" },
                { title: "Engine Check", content: "Run the automated tests to verify the suite's DSP engine is producing accurate clinical signals.", selector: ".play-btn" },
                { title: "Results Log", content: "View technical details like filter attenuation and stereo separation here.", selector: "#results" }
            ],
            'twotone': [
                { title: "Bracketing", content: "Compare Tone A and Tone B to 'bracket' your tinnitus. This helps avoid octave-match errors.", selector: ".card:first-of-type" },
                { title: "Saving", content: "If one tone is a perfect match, save it directly to your global settings.", selector: "button[onclick*='saveToNotch']" }
            ],
            'sweep': [
                { title: "Range Test", content: "This sweep moves from 20Hz to 20kHz. It helps identify 'dead zones' or frequency triggers.", selector: "h2" },
                { title: "Volume Safety", content: "Always start at a low volume (10% or less) before beginning a high-frequency sweep.", selector: "#volSlider" }
            ],
            'audiogram': [
                { title: "Hearing Profile", content: "Enter your thresholds from a professional clinical audiogram (0-110dB HL).", selector: "h1" },
                { title: "Red Circles, Blue X", content: "Switch between ears to map your specific thresholds. Right ear uses circles (Red), Left ear uses X (Blue).", selector: ".ear-tabs" },
                { title: "Half-Gain Rule", content: "The dashed line shows the 'Target Compensation'. The suite automatically calculates a safe therapeutic boost to reduce listening effort.", selector: ".audiogram-container" },
                { title: "Digital Safety", content: "The compensation is capped at 20dB to prevent digital distortion and ensure acoustic safety.", selector: ".legend" },
                { title: "Tinnitus Location", content: "Set your tinnitus side here. This provides an intelligent L/R volume balance default for all therapy modules.", selector: ".card:last-of-type" }
            ],
            'clinical_summary': [
                { title: "Doctor's Summary", content: "This document is designed to help you communicate your progress and the suite's protocols to your healthcare provider.", selector: "h1" },
                { title: "Research Summary", content: "It summarizes the clinical research parameters for Notch, CR, and Bimodal therapies used in this suite.", selector: "h2:first-of-type" },
                { title: "Your Metrics", content: "This section automatically populates with your THI scores, MML levels, and adherence logs.", selector: "h2:nth-of-type(2)" },
                { title: "The Habituation Model", content: "Crucial information explaining the 'Mixing Point' philosophy and our focus on habituation over masking.", selector: ".highlight-box" },
                { title: "Technical Rigor", content: "Verification data showing the suite meets clinical DSP standards (attenuation and precision).", selector: "h2:nth-of-type(3)" },
                { title: "Download & Print", content: "Click here to generate a clean PDF summary. You can print it for your next appointment or upload it to your patient portal. <b>Note:</b> If you have reached Phase 6: Full Habituation, you can also attach your Achievement Certificate for a complete record.", selector: ".no-print .button" }
            ],
            'hearingtest': [
                { title: "Exploration", content: "Tap each button to check your audibility thresholds across the spectrum.", selector: ".section-title" },
                { title: "Clinical Note", content: "Remember: This is an exploration tool, not a replacement for a professional audiogram.", selector: "p" }
            ]
        };

        if (tutorials[key]) {
            showWalkthrough(tutorials[key], startIndex);
        } else {
            showQuickStartGuide();
        }
    }

    function applyCompactMode() {
        const isCompact = loadSetting('compact_mode', 'false') === 'true';
        document.documentElement.classList.toggle('compact-mode', isCompact);
    }

    function toggleCompactMode() {
        const isCompact = loadSetting('compact_mode', 'false') === 'true';
        saveSetting('compact_mode', isCompact ? 'false' : 'true');
        applyCompactMode();
    }

    function applyDashboardLayout() {
        const layout = loadSetting('dashboard_layout', '2-column');
        document.documentElement.classList.toggle('single-column-layout', layout === '1-column');
    }

    function toggleDashboardLayout() {
        const current = loadSetting('dashboard_layout', '2-column');
        const next = current === '2-column' ? '1-column' : '2-column';
        saveSetting('dashboard_layout', next);
        applyDashboardLayout();
    }

    function applyTheme() {
        const theme = loadSetting('theme', 'dark');
        document.documentElement.classList.toggle('light-mode', theme === 'light');
        if (document.body) {
            document.body.classList.toggle('light-mode', theme === 'light');
        }
    }

    function applyEmailVisibility() {
        const email = loadSetting('audiologist_email', '');
        const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        document.querySelectorAll('.email-audiologist-btn').forEach(btn => {
            btn.classList.toggle('hidden', !isValid);
        });
    }

    function toggleTheme() {
        const theme = loadSetting('theme', 'dark');
        const next = theme === 'dark' ? 'light' : 'dark';
        saveSetting('theme', next);
        applyTheme();
    }

    function syncUIVersion() {
        document.querySelectorAll('.app-version-label').forEach(el => {
            const prefix = el.dataset.versionPrefix || '';
            const suffix = el.dataset.versionSuffix || '';
            el.textContent = `${prefix}${APP_VERSION}${suffix}`;
        });
    }

    // Immediate application to prevent flash of unstyled content
    (function () {
        const theme = localStorage.getItem('tts_theme');
        if (theme === 'light') {
            document.documentElement.classList.add('light-mode');
        }

        const compact = localStorage.getItem('tts_compact_mode');
        if (compact === 'true') {
            document.documentElement.classList.add('compact-mode');
        }

        const layout = localStorage.getItem('tts_dashboard_layout');
        if (layout === '1-column') {
            document.documentElement.classList.add('single-column-layout');
        }

        // Splash Screen Persistence: Prevent re-showing splash when navigating back Home in the same session.
        try {
            if (sessionStorage.getItem('tts_splash_shown') === 'true') {
                const style = document.createElement('style');
                style.id = 'tts-splash-suppressor';
                style.textContent = '#appSplashScreen { display: none !important; visibility: hidden !important; pointer-events: none !important; opacity: 0 !important; animation: none !important; transition: none !important; }';
                document.head.appendChild(style);
            }
        } catch (e) { }

        // --- Trahreg Gatekeeper Logic ---
        (async function () {
            const fullPath = decodeURIComponent(window.location.pathname).toLowerCase();
            const pageName = fullPath.split('/').pop() || 'index.html';
            const isDocs = fullPath.includes('/docs/');

            // Debug Bypass: Allows testers to skip onboarding via URL parameter ?debug=1
            const urlParams = new URLSearchParams(window.location.search);
            const isDebug = urlParams.get('debug') === '1' || localStorage.getItem('tts_debug_mode') === 'true';

            if (isDebug) {
                console.info("[Gatekeeper] Debug mode active. Bypassing onboarding requirements.");
                _memSessionActive = true;
            }

            async function checkGatekeeper() {
                try {
                    const configPath = isDocs ? '../maintenance.json' : 'maintenance.json';
                    const response = await fetch(configPath, { cache: 'no-store' });
                    if (response.ok) {
                        const config = await response.json();

                        // 1. Version Force Refresh: Detect if server code is newer than client session
                        if (config.version && config.version !== APP_VERSION && !window.location.search.includes('v=' + config.version)) {
                            console.info(`[Gatekeeper] Remote update detected (${config.version}). Forcing refresh...`);
                            const url = new URL(window.location.href);
                            url.searchParams.set('v', config.version);
                            window.location.replace(url.toString());
                            return;
                        }

                        // 2. Maintenance Mode Routing
                        const isMaintActive = config.enabled === true;
                        MAINTENANCE_MODE = isMaintActive;
                        window.REMOTE_CONFIG = config;

                        if (isMaintActive) {
                            if (pageName !== 'maintenance.html' && !isDebug) {
                                console.warn("[Gatekeeper] Suite is down for maintenance. Redirecting...");
                                const url = new URL(isDocs ? '../maintenance.html' : 'maintenance.html', window.location.origin);
                                url.search = window.location.search;
                                window.location.replace(url.toString());
                                return;
                            } else if (pageName === 'maintenance.html' && isDebug) {
                                console.info("[Gatekeeper] Maintenance active but Debug detected. Returning to suite...");
                                const url = new URL(isDocs ? '../index.html' : 'index.html', window.location.origin);
                                url.search = window.location.search;
                                window.location.replace(url.toString());
                                return;
                            }
                        } else if (pageName === 'maintenance.html') {
                            console.log("[Gatekeeper] Maintenance concluded. Returning to suite...");
                            const url = new URL(isDocs ? '../index.html' : 'index.html', window.location.origin);
                            url.search = window.location.search;
                            window.location.replace(url.toString());
                            return;
                        }
                        return isMaintActive; // Return state to IIFE
                    }
                } catch (e) {
                    console.warn("[Gatekeeper] Health check failure:", e);
                }
                return false; // Fail-open: proceed if check fails or response is not ok
            }

            // Perform initial check. If maintenance is active, stop further gating logic.
            const isMaint = await checkGatekeeper();
            setInterval(checkGatekeeper, 300000); // Check every 5 minutes
            if (isMaint && !isDebug) return;

            // 1. Identify Home/Root and authorize the session (more robust detection)
            // Check if the path ends with common root patterns or project directory name
            const homePatterns = ['index.html', '', 'tinnitus_therapy', 'tinnitus_therapy/'];
            const isHome = homePatterns.some(p => pageName === p || fullPath.endsWith(p));

            try {
                // Set session active if we are on the home page or a public page to avoid immediate redirect
                if (isHome || isDocs) _memSessionActive = true;

                // If we are on a therapy page or tool, mark splash as shown so going "Home" skips it.
                if (!isHome && !isDocs) {
                    sessionStorage.setItem('tts_splash_shown', 'true');
                }
            } catch (e) { /* Private mode protection */ }

            // 2. Identify Whitelisted (Public) pages
            const publicPages = ['index.html', 'disclaimer.html', 'license.html', 'about.html', 'research.html', 'feedback.html', 'presentation.html', 'handout.html', 'clinical_summary.html', 'stats.html', 'audiogram.html', 'hearingtest.html', 'cbt.html', 'validation.html', 'notchfinder.html'];
            const isPublicPage = isHome || publicPages.some(p => pageName === p);

            const onboardingStep = parseInt(loadSetting('onboarding_step', '0')); // Default to 0 if not set
            const sessionActive = _memSessionActive || (function () {
                try { return sessionStorage.getItem('tts_session_active') === 'true'; }
                catch (e) { return false; }
            })();

            if (!isStorageAvailable()) {
                console.error("[Gatekeeper] LocalStorage is blocked. The suite cannot save your progress.");
                alert("Warning: Your browser is blocking LocalStorage. Therapy settings and progress will not be saved.");
            }

            // 3. Enforce Redirection: Bypass if already onboarded OR session is active
            // New logic: If onboarding is not complete (step < 5) AND it's not a public page AND not the home page, redirect to home.
            if (onboardingStep < 6 && !isPublicPage && !isHome && !isDebug) {
                console.warn(`[Gatekeeper] Onboarding not complete (step ${onboardingStep}). Redirecting to home...`);
                const redirectTarget = isDocs ? '../index.html' : 'index.html';
                window.location.replace(redirectTarget);
                return; // Stop further execution on this page
            }
            // If on the home page, and onboarding is not complete, ensure the onboarding modal is shown.
            if (isHome && onboardingStep < 6) {
                console.log(`[Gatekeeper] Onboarding in progress (step ${onboardingStep}). Allowing access to home page.`);
            }
        })();

        // Re-sync with body once DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                applyTheme();
                applyCompactMode();
                applyDashboardLayout();
                applyEmailVisibility();
                syncUIVersion();

                // Version Update Notification
                const onboardingStep = parseInt(localStorage.getItem('tts_onboarding_step') || '0');
                const lastSeenVersion = localStorage.getItem('tts_last_seen_version');
                // Only trigger "What's New" if user has completed onboarding to avoid UI conflicts
                if (onboardingStep >= 6 && lastSeenVersion && lastSeenVersion !== APP_VERSION) {
                    setTimeout(showWhatsNew, 1500);
                }
            });
        } else {
            applyTheme();
            applyCompactMode();
            applyDashboardLayout();
            applyEmailVisibility();
            if (typeof i18n !== 'undefined') i18n.applyTranslations(); // Apply translations on theme change
            syncUIVersion();

            // Version Update Notification
            const onboardingStep = parseInt(localStorage.getItem('tts_onboarding_step') || '0');
            const lastSeenVersion = localStorage.getItem('tts_last_seen_version');
            if (onboardingStep >= 6 && lastSeenVersion && lastSeenVersion !== APP_VERSION) {
                setTimeout(showWhatsNew, 1500);
            }
        }

        function needsValidation() {
            return !getUnifiedValidationStatus().isValid;
        }

        // Expose all relevant components to window for compatibility with non-module scripts
        Object.assign(window, {
            isStorageAvailable,
            getJson,
            setJson,
            loadSetting,
            saveSetting,
            getTodayKey,
            SystemCompatibilityAudit,
            getPrivacyAudit,
            completeOnboarding,
            setOnboardingStep,
            getLocalStorageUsage,
            requestPersistentStorage,
            TinnitusAIManager,
            deriveKeyFromPin,
            encryptGeminiKey,
            decryptGeminiKey,
            resetOnboarding,
            getLatestLogData,
            getThoughtRecords,
            getDistressScores,
            getDailyUsage,
            logDistressScore,
            logUsageMinutes,
            logRIResult,
            logTMCPoint,
            logQFactor,
            logLoudnessGrowthPoint,
            logThoughtRecordEntry,
            getMilestoneProgress,
            toggleMilestone,
            markSplashShown,
            resetModuleSettings,
            getUnifiedValidationStatus,
            ClinicalSafetyAudit,
            NoiseGenerator,
            createTrahregNoise,
            getAudioDevices,
            logTherapyError,
            getTherapyErrorLog,
            sendClinicalTelemetry,
            getHearingBoost,
            getBalancePreset,
            isFrequencySafe,
            exportAllData,
            exportClinicalDataCSV,
            deleteLogEntry,
            clearAllLogs,
            importAllData,
            getClinicalReportData,
            generateClinicalReportText,
            generateClinicalReportHtml,
            generateGlobalClinicalReportPDF,
            generateMilestoneCertificatePDF,
            getTherapyRecommendations,
            shareSetup,
            initAI,
            performGeminiTest,
            fetchAIAssistance,
            getBalancedThoughtSuggestion,
            getSOSSupport,
            getSoundRecipe,
            getPatternAnalysis,
            getTRTExplanation,
            getClinicalSummary,
            getDailyMotivation,
            getEnvironmentalAdvice,
            getMindfulnessScript,
            getHabituationForecast,
            getPersonalizedInsights,
            getRIResults,
            getMMLResults,
            getLoudnessGrowthLog,
            getQFactors,
            getTMCLog,
            clearTMCLog,
            saveSoundscapePreset,
            loadSoundscapePreset,
            getLastTHIAssessmentDate,
            getLastHearingTestDate,
            showWalkthrough,
            showWhatsNew,
            closeWhatsNew,
            showQuickStartGuide,
            startModuleTutorial,
            toggleCompactMode,
            toggleDashboardLayout,
            toggleTheme,
            applyCompactMode,
            applyDashboardLayout,
            applyTheme,
            applyEmailVisibility,
            syncUIVersion,
            needsValidation,
            tinnitusAI,
            APP_VERSION
        });
    })();
