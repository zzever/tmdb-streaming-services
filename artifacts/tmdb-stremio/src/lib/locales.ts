export interface WatchLocale {
  code: string;
  name: string;
  flag: string;
  lang: string;
}

export const WATCH_LOCALES: WatchLocale[] = [
  { code: "AR", name: "Argentina", flag: "🇦🇷", lang: "es-AR" },
  { code: "AU", name: "Australia", flag: "🇦🇺", lang: "en-AU" },
  { code: "AT", name: "Austria", flag: "🇦🇹", lang: "de-AT" },
  { code: "BE", name: "Bélgica", flag: "🇧🇪", lang: "fr-BE" },
  { code: "BR", name: "Brasil", flag: "🇧🇷", lang: "pt-BR" },
  { code: "CA", name: "Canadá", flag: "🇨🇦", lang: "en-CA" },
  { code: "CL", name: "Chile", flag: "🇨🇱", lang: "es-CL" },
  { code: "CO", name: "Colombia", flag: "🇨🇴", lang: "es-CO" },
  { code: "CZ", name: "Chequia", flag: "🇨🇿", lang: "cs-CZ" },
  { code: "DK", name: "Dinamarca", flag: "🇩🇰", lang: "da-DK" },
  { code: "FI", name: "Finlandia", flag: "🇫🇮", lang: "fi-FI" },
  { code: "FR", name: "Francia", flag: "🇫🇷", lang: "fr-FR" },
  { code: "DE", name: "Alemania", flag: "🇩🇪", lang: "de-DE" },
  { code: "GR", name: "Grecia", flag: "🇬🇷", lang: "el-GR" },
  { code: "HU", name: "Hungría", flag: "🇭🇺", lang: "hu-HU" },
  { code: "IN", name: "India", flag: "🇮🇳", lang: "hi-IN" },
  { code: "IE", name: "Irlanda", flag: "🇮🇪", lang: "en-IE" },
  { code: "IL", name: "Israel", flag: "🇮🇱", lang: "he-IL" },
  { code: "IT", name: "Italia", flag: "🇮🇹", lang: "it-IT" },
  { code: "JP", name: "Japón", flag: "🇯🇵", lang: "ja-JP" },
  { code: "MX", name: "México", flag: "🇲🇽", lang: "es-MX" },
  { code: "NL", name: "Países Bajos", flag: "🇳🇱", lang: "nl-NL" },
  { code: "NZ", name: "Nueva Zelanda", flag: "🇳🇿", lang: "en-NZ" },
  { code: "NO", name: "Noruega", flag: "🇳🇴", lang: "no-NO" },
  { code: "PL", name: "Polonia", flag: "🇵🇱", lang: "pl-PL" },
  { code: "PT", name: "Portugal", flag: "🇵🇹", lang: "pt-PT" },
  { code: "RU", name: "Rusia", flag: "🇷🇺", lang: "ru-RU" },
  { code: "ZA", name: "Sudáfrica", flag: "🇿🇦", lang: "en-ZA" },
  { code: "KR", name: "Corea del Sur", flag: "🇰🇷", lang: "ko-KR" },
  { code: "ES", name: "España", flag: "🇪🇸", lang: "es-ES" },
  { code: "SE", name: "Suecia", flag: "🇸🇪", lang: "sv-SE" },
  { code: "CH", name: "Suiza", flag: "🇨🇭", lang: "de-CH" },
  { code: "TR", name: "Turquía", flag: "🇹🇷", lang: "tr-TR" },
  { code: "GB", name: "Reino Unido", flag: "🇬🇧", lang: "en-GB" },
  { code: "US", name: "Estados Unidos", flag: "🇺🇸", lang: "en-US" },
  { code: "VE", name: "Venezuela", flag: "🇻🇪", lang: "es-VE" },
].sort((a, b) => a.name.localeCompare(b.name, "es"));

export const DEFAULT_LOCALE = WATCH_LOCALES.find((l) => l.code === "ES")!;

const STORAGE_KEY = "watch-locale";

export function getSavedLocale(): WatchLocale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const found = WATCH_LOCALES.find((l) => l.code === saved);
      if (found) return found;
    }
  } catch {
  }
  return DEFAULT_LOCALE;
}

export function saveLocale(locale: WatchLocale): void {
  try {
    localStorage.setItem(STORAGE_KEY, locale.code);
  } catch {
  }
}
