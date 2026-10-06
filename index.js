import { registerRootComponent } from 'expo';
import notifee, { EventType } from '@notifee/react-native';
import { rememberNotification } from './src/features/notifications/service';
import App from './App';

// Kapalı uygulamaya gelen bildirim seçimi cihazda tutulur; açılışta ekran yönlendirilir.
notifee.onBackgroundEvent(async ({ type, detail }) => {
  if (type === EventType.PRESS && detail.notification?.data?.programId) {
    rememberNotification(String(detail.notification.data.programId));
  }
});
registerRootComponent(App);
