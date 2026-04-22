import { createContext, useContext, useState } from 'react'
import en from '../i18n/en'
import fr from '../i18n/fr'

const translations = { en, fr }
const LangContext = createContext(null)

export function LangProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('lang') || 'en')

  function t(key) {
    return translations[lang][key] ?? key
  }

  function toggleLang() {
    const next = lang === 'en' ? 'fr' : 'en'
    localStorage.setItem('lang', next)
    setLang(next)
  }

  return (
    <LangContext.Provider value={{ lang, t, toggleLang }}>
      {children}
    </LangContext.Provider>
  )
}

export function useLang() {
  return useContext(LangContext)
}
