import React, { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';
import { useSettingsStore } from '../features/settings/store';
const light = {
  background: '#F6F5F1',
  card: '#FFFFFF',
  text: '#172524',
  muted: '#66716D',
  border: '#E1E5DF',
  accent: '#C53035',
  onAccent: '#FFFFFF',
  soft: '#FBE8E7',
};
const dark = {
  background: '#111B1A',
  card: '#1C2926',
  text: '#F4F4EC',
  muted: '#A7B3AA',
  border: '#34453E',
  accent: '#FF7478',
  onAccent: '#111B1A',
  soft: '#3D2528',
};
const ThemeContext = createContext(light);
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const choice = useSettingsStore(state => state.settings.theme);
  const system = useColorScheme();
  const isDark =
    choice === 'dark' || (choice === 'system' && system === 'dark');
  return (
    <ThemeContext.Provider value={isDark ? dark : light}>
      {children}
    </ThemeContext.Provider>
  );
}
export const useTheme = () => useContext(ThemeContext);
