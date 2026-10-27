import { Platform } from 'react-native';

// Default backend URLs depending on environment
// Android Emulator uses 10.0.2.2 to access Mac localhost
// iOS Simulator uses localhost
export const DEFAULT_BACKEND_URL = Platform.select({
  android: 'http://10.0.2.2:3000',
  ios: 'http://localhost:3000',
  default: 'http://localhost:3000',
});

export const DEFAULT_SHARED_SECRET = 'paa-dev-secret';

// VAD & Recording Constraints
export const RECORDING_LIMITS = {
  // Metering dB threshold above which we treat audio as voice
  // Silence is typically <= -45dB to -50dB in expo-av metering
  VOICE_ACTIVITY_THRESHOLD_DB: -42,

  // Stop recording after 1.5s (1500ms) of silence once voice was detected
  SILENCE_DURATION_MS: 1500,

  // Hard stop recording after 30 seconds
  MAX_RECORDING_DURATION_MS: 30000,

  // Metering check interval in ms
  METERING_INTERVAL_MS: 100,
};
