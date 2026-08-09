import { Alert, AlertButton, Platform } from 'react-native';

/**
 * Drop-in replacement for RN's Alert.alert. react-native-web stubs Alert.alert
 * out entirely (`static alert() {}`), so every confirmation dialog and info
 * popup in the app silently does nothing when running via `expo start --web` —
 * including the button whose onPress contains the actual action (e.g. sign-out).
 * Falls back to window.confirm/alert on web; identical behavior to Alert.alert on native.
 */
export function showAlert(title: string, message?: string, buttons?: AlertButton[]): void {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons);
    return;
  }

  const text = message ? `${title}\n\n${message}` : title;

  if (!buttons || buttons.length === 0) {
    window.alert(text);
    return;
  }

  if (buttons.length === 1) {
    window.alert(text);
    buttons[0].onPress?.();
    return;
  }

  // Two (or more) buttons: treat as confirm/cancel — the non-cancel-style
  // button is the "confirm" action.
  const cancelButton = buttons.find((b) => b.style === 'cancel');
  const confirmButton = buttons.find((b) => b.style !== 'cancel') ?? buttons[buttons.length - 1];

  if (window.confirm(text)) {
    confirmButton.onPress?.();
  } else {
    cancelButton?.onPress?.();
  }
}
