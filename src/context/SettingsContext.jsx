import React, { createContext, useContext, useState, useEffect } from 'react';
import { publicApi } from '../services/api';

const SettingsContext = createContext(null);

/* ── Publicly-readable platform settings ───────────────────── */
export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState({});
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    publicApi.get('/settings')
      .then(r => setSettings(r.data.data || {}))
      .catch(() => {/* silently fallback to defaults */})
      .finally(() => setLoading(false));
  }, []);

  /* Derived helpers with sensible defaults */
  const currency        = settings.default_currency  || 'QAR';
  const platformName    = settings.platform_name     || 'AunAdvisory';
  const contactEmail    = settings.platform_email    || 'hello@aunadvisory.com';
  const legalEmail      = settings.legal_email       || 'legal@aunadvisory.com';
  const privacyEmail    = settings.privacy_email     || 'privacy@aunadvisory.com';
  const contactPhone    = settings.contact_phone     || '+974 4400 0000';
  const contactAddress  = settings.contact_address   || 'Qatar Financial Centre, Doha, Qatar';
  const officeHours     = settings.office_hours      || 'Sun–Thu: 8:00 AM – 6:00 PM AST';
  const jitsiDomain     = settings.jitsi_domain      || 'meet.jit.si';

  return (
    <SettingsContext.Provider value={{
      settings, loading,
      currency, platformName,
      contactEmail, legalEmail, privacyEmail,
      contactPhone, contactAddress, officeHours,
      jitsiDomain,
    }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider');
  return ctx;
};

export default SettingsContext;
