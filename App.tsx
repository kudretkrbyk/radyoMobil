import React, { useEffect, useState } from 'react';
import { AppState, StatusBar } from 'react-native';
import {
  NavigationContainer,
  createNavigationContainerRef,
  DarkTheme,
  DefaultTheme,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import notifee, { EventType } from '@notifee/react-native';
import { ThemeProvider, useTheme } from './src/app/theme';
import {
  PlayerScreen,
  ProgramsScreen,
  FavoritesScreen,
  SettingsScreen,
  ProgramScreen,
  RadiosScreen,
} from './src/app/screens';
import { audioPlayer } from './src/core/audio/AudioPlayerService';
import { useScheduleStore } from './src/features/schedule/store/scheduleStore';
import { useSettingsStore } from './src/features/settings/store';
import {
  reconcileReminders,
  rememberNotification,
  takeNotification,
} from './src/features/notifications/service';
import { useStationsStore } from './src/features/stations/store';
import { useFavoritesStore } from './src/features/favorites/store';
import type { RootStackParams } from './src/types';

const Stack = createNativeStackNavigator<RootStackParams>();
const navigationRef = createNavigationContainerRef<RootStackParams>();
function Application() {
  const colors = useTheme();
  const [ready, setReady] = useState(false);
  const [navigationReady, setNavigationReady] = useState(false);
  useEffect(() => {
    audioPlayer.initialize();
    // iOS ilk bildirim dokunuşunu yükleme tamamlanmadan da iletebilir.
    const unsubscribe = notifee.onForegroundEvent(({ type, detail }) => {
      if (type !== EventType.PRESS || !detail.notification?.data?.programId) {
        return;
      }
      const id = String(detail.notification.data.programId);
      if (
        !useScheduleStore.getState().programs.length ||
        !navigationRef.isReady()
      ) {
        rememberNotification(id);
        return;
      }
      navigationRef.navigate('Program', { programId: id });
      if (useSettingsStore.getState().settings.autoPlayFromNotification) {
        const program = useScheduleStore
          .getState()
          .programs.find(p => p.id === id);
        const station = useStationsStore
          .getState()
          .radios.find(s => s.id === program?.stationId);
        if (station) void audioPlayer.playStation(station);
      }
    });
    void useScheduleStore
      .getState()
      .load()
      .then(() => {
        useFavoritesStore.getState().syncPrograms();
        setReady(true);
      });
    return () => {
      unsubscribe();
      audioPlayer.dispose();
    };
  }, []);
  useEffect(() => {
    if (!ready || !navigationReady) {
      return;
    }
    const open = (id: string) => {
      if (navigationRef.isReady()) {
        navigationRef.navigate('Program', { programId: id });
      } else {
        rememberNotification(id);
        return;
      }
      if (useSettingsStore.getState().settings.autoPlayFromNotification) {
        const program = useScheduleStore
          .getState()
          .programs.find(p => p.id === id);
        const station = useStationsStore
          .getState()
          .radios.find(s => s.id === program?.stationId);
        if (station) void audioPlayer.playStation(station);
      }
    };
    const checkPending = async () => {
      const initial = await notifee.getInitialNotification();
      const pending = takeNotification();
      const id = pending ?? initial?.notification.data?.programId;
      if (id) {
        open(String(id));
      }
      // Sistem saati veya saat dilimi değişmişse gelecek haftanın tetikleyicileri yeniden hesaplanır.
      void reconcileReminders(useScheduleStore.getState().programs).catch(
        () => {},
      );
    };
    void checkPending();
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        void checkPending();
      }
    });
    return () => {
      subscription.remove();
    };
  }, [ready, navigationReady]);
  const dark = colors.background === '#111B1A';
  const theme = {
    ...(dark ? DarkTheme : DefaultTheme),
    colors: {
      ...(dark ? DarkTheme : DefaultTheme).colors,
      background: colors.background,
      card: colors.card,
      text: colors.text,
      primary: colors.accent,
      border: colors.border,
    },
  };
  return (
    <NavigationContainer
      ref={navigationRef}
      theme={theme}
      onReady={() => setNavigationReady(true)}
    >
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} />
      <Stack.Navigator
        screenOptions={{
          headerBackTitle: 'Geri',
          headerTintColor: colors.text,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.background },
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen
          name="Player"
          component={PlayerScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Radios"
          component={RadiosScreen}
          options={{ title: 'Radyo listem' }}
        />
        <Stack.Screen
          name="Programs"
          component={ProgramsScreen}
          options={{ title: 'Programlar' }}
        />
        <Stack.Screen
          name="Favorites"
          component={FavoritesScreen}
          options={{ title: 'Favoriler' }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ title: 'Ayarlar' }}
        />
        <Stack.Screen
          name="Program"
          component={ProgramScreen}
          options={{ title: 'Program' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <Application />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
