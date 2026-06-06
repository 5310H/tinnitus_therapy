/**
 * lang.js
 * Core localization framework for the Tinnitus Therapy Suite.
 * Handles loading language files and applying translations to the DOM.
 */

const i18n = {
    currentLang: 'en', // Default language
    translations: {},
    availableLanguages: {
        'en': 'English',
        'es': 'Español',
        'de': 'Deutsch',
        // Add more languages here
    },

    /**
     * Initializes the localization system.
     * Loads the user's saved language or defaults to English.
     */
    async init() {
        // Ensure storage.js is loaded
        if (typeof loadSetting !== 'function') {
            console.error("i18n: storage.js not loaded. Cannot retrieve language setting.");
            return;
        }
        const savedLang = loadSetting('app_language', 'en');
        await this.loadLanguage(savedLang);
    },

    /**
     * Loads the specified language file and applies translations.
     * @param {string} langCode - The language code (e.g., 'en', 'es').
     */
    async loadLanguage(langCode) {
        if (!this.availableLanguages[langCode]) {
            console.warn(`i18n: Language '${langCode}' not supported. Falling back to 'en'.`);
            langCode = 'en';
        }

        try {
            const response = await fetch(`./lang/${langCode}.json`);
            if (!response.ok) {
                throw new Error(`Failed to load language file: ${langCode}.json`);
            }
            this.translations = await response.json();
            this.currentLang = langCode;
            if (typeof saveSetting === 'function') {
                saveSetting('app_language', langCode);
            }
            this.applyTranslations();
            console.log(`i18n: Language set to ${this.availableLanguages[langCode]} (${langCode}).`);
        } catch (error) {
            console.error(`i18n: Error loading language ${langCode}:`, error);
            // Fallback to English if loading fails
            if (langCode !== 'en') {
                await this.loadLanguage('en');
            }
        }
    },

    /**
     * Applies translations to all elements with `data-i18n` attributes.
     */
    applyTranslations() {
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = this.translations[key] || key; // Fallback to key if not found
            if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                element.placeholder = translation;
            } else {
                element.textContent = translation;
            }
        });
    },

    /**
     * Retrieves a translation for a given key.
     * @param {string} key - The translation key.
     * @param {string} [fallback] - Optional fallback text if translation not found.
     * @returns {string} The translated string or fallback/key.
     */
    getTranslation(key, fallback = key) {
        return this.translations[key] || fallback;
    }
};

// Initialize i18n when the DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => i18n.init());
} else {
    i18n.init();
}

// Expose i18n globally for easy access
window.i18n = i18n;