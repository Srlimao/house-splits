// HouseSplits Web Push Notification Client Service

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isPushNotificationSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export async function getNotificationPermission(): Promise<NotificationPermission> {
  if (!isPushNotificationSupported()) return 'denied';
  return Notification.permission;
}

export async function registerPushServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushNotificationSupported()) return null;
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    await navigator.serviceWorker.ready;
    return registration;
  } catch (err) {
    console.error('Service worker registration failed:', err);
    return null;
  }
}

export async function getExistingPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushNotificationSupported()) return null;
  try {
    const registration = await navigator.serviceWorker.ready;
    return await registration.pushManager.getSubscription();
  } catch {
    return null;
  }
}

export async function subscribeToPushNotifications(
  profileId: string,
  householdId?: string
): Promise<PushSubscription> {
  if (!isPushNotificationSupported()) {
    throw new Error('Push notifications are not supported on this browser or device.');
  }

  // 1. Request browser / Android notification permission
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error(
      permission === 'denied'
        ? 'Notification permission was denied in your browser settings. Please enable it to receive reminders.'
        : 'Notification permission was dismissed.'
    );
  }

  // 2. Ensure Service Worker is registered
  const registration = await registerPushServiceWorker();
  if (!registration) {
    throw new Error('Could not initialize service worker.');
  }

  // 3. Fetch VAPID public key from backend
  const resKey = await fetch('/api/notifications/vapid-key');
  if (!resKey.ok) {
    throw new Error('Could not retrieve VAPID public key from server.');
  }
  const { publicKey } = await resKey.json();

  // 4. Subscribe with PushManager
  const applicationServerKey = urlBase64ToUint8Array(publicKey);
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: applicationServerKey as unknown as BufferSource,
  });

  // 5. Send subscription to backend Cloudflare D1
  const subJson = subscription.toJSON();
  const resSave = await fetch('/api/notifications/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      profileId,
      householdId,
      subscription: subJson,
    }),
  });

  if (!resSave.ok) {
    const data = await resSave.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to save push subscription on server.');
  }

  return subscription;
}

export async function unsubscribeFromPushNotifications(profileId?: string): Promise<boolean> {
  if (!isPushNotificationSupported()) return false;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await fetch('/api/notifications/subscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      }).catch(() => {});

      return await subscription.unsubscribe();
    }
  } catch (err) {
    console.error('Error unsubscribing:', err);
  }
  return false;
}

export async function sendTestPushNotification(profileId: string): Promise<any> {
  const res = await fetch('/api/notifications/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profileId }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to dispatch test notification.');
  }
  return data;
}
