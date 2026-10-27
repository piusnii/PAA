import { StatusBar } from 'expo-status-bar';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Animated,
  Platform,
} from 'react-native';
import { AppState, AppConfig, TranscribeResponse } from './src/types';
import { DEFAULT_BACKEND_URL, DEFAULT_SHARED_SECRET } from './src/config/constants';
import { audioService, AudioLevelUpdate } from './src/services/audio';
import { uploadAudioForTranscription, ApiError } from './src/services/api';
import { StateIndicator } from './src/components/StateIndicator';
import { AudioVisualizer } from './src/components/AudioVisualizer';
import { ConfigModal } from './src/components/ConfigModal';

export default function App() {
  const [appState, setAppState] = useState<AppState>('idle');
  const [transcript, setTranscript] = useState<string>('');
  const [isMockResult, setIsMockResult] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Live audio metering & silence detection state
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [silenceElapsed, setSilenceElapsed] = useState<number>(0);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);

  // Settings configuration
  const [config, setConfig] = useState<AppConfig>({
    backendUrl: DEFAULT_BACKEND_URL || 'http://localhost:3000',
    sharedSecret: DEFAULT_SHARED_SECRET,
  });
  const [configModalVisible, setConfigModalVisible] = useState<boolean>(false);

  // Button pulse animation during listening
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (appState === 'listening') {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [appState]);

  // Audio level callback
  const handleAudioLevelUpdate = useCallback((update: AudioLevelUpdate) => {
    setAudioLevel(update.normalizedLevel);
    setSilenceElapsed(update.silenceElapsedMillis);
    setRecordingSeconds(Math.floor(update.durationMillis / 1000));
  }, []);

  // Process and upload audio recording to backend
  const processRecording = async (uri: string | null) => {
    if (!uri) {
      setAppState('idle');
      return;
    }

    setAppState('thinking');
    setErrorMessage(null);

    try {
      const response: TranscribeResponse = await uploadAudioForTranscription(
        uri,
        config.backendUrl,
        config.sharedSecret
      );

      setTranscript(response.text.trim());
      setIsMockResult(Boolean(response.isMock));
      setAppState('done');
    } catch (err: any) {
      console.error('[PAA App] Transcription failed:', err);
      const message =
        err instanceof ApiError
          ? `${err.message}${err.details ? ` (${err.details})` : ''}`
          : 'Could not connect to backend server. Please verify settings.';
      setErrorMessage(message);
      setAppState('error');
    }
  };

  // Called when 1.5s silence VAD or 30s timeout is triggered
  const handleSilenceTrigger = useCallback(async () => {
    const uri = await audioService.stopRecording();
    await processRecording(uri);
  }, [config]);

  // Start listening
  const startListening = async () => {
    setTranscript('');
    setErrorMessage(null);
    setSilenceElapsed(0);
    setRecordingSeconds(0);
    setAudioLevel(0);

    try {
      setAppState('listening');
      await audioService.startRecording({
        onSilenceTrigger: handleSilenceTrigger,
        onLevelUpdate: handleAudioLevelUpdate,
      });
    } catch (err: any) {
      console.error('[PAA App] Error starting recording:', err);
      setErrorMessage(err?.message || 'Failed to start audio recording');
      setAppState('error');
    }
  };

  // Stop listening manually (tap-to-talk button)
  const stopListening = async () => {
    const uri = await audioService.stopRecording();
    await processRecording(uri);
  };

  // Handle Main Record Button Press
  const handleMainButtonPress = () => {
    if (appState === 'listening') {
      stopListening();
    } else if (appState !== 'thinking') {
      startListening();
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />

      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>PAA</Text>
          <Text style={styles.subtitle}>Personal Agentic Assistant</Text>
        </View>

        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => setConfigModalVisible(true)}
          accessibilityLabel="Connection Settings"
        >
          <Text style={styles.settingsButtonText}>⚙️ Settings</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Status indicator badge */}
        <StateIndicator
          state={appState}
          silenceElapsedMillis={appState === 'listening' ? silenceElapsed : 0}
        />

        {/* Audio Waveform Visualizer */}
        <AudioVisualizer
          level={audioLevel}
          isListening={appState === 'listening'}
        />

        {/* Central Voice Button */}
        <View style={styles.buttonContainer}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity
              style={[
                styles.mainButton,
                appState === 'listening' && styles.mainButtonListening,
                appState === 'thinking' && styles.mainButtonThinking,
              ]}
              onPress={handleMainButtonPress}
              disabled={appState === 'thinking'}
              activeOpacity={0.8}
            >
              {appState === 'thinking' ? (
                <ActivityIndicator size="large" color="#ffffff" />
              ) : (
                <Text style={styles.micIcon}>
                  {appState === 'listening' ? '⏹' : '🎙'}
                </Text>
              )}
            </TouchableOpacity>
          </Animated.View>

          <Text style={styles.buttonLabel}>
            {appState === 'listening'
              ? `Listening (${recordingSeconds}s)... Tap to Finish`
              : appState === 'thinking'
              ? 'Sending to Whisper...'
              : 'Tap to Speak'}
          </Text>
        </View>

        {/* Transcript Card */}
        {appState === 'done' && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Transcript</Text>
              {isMockResult && (
                <View style={styles.mockBadge}>
                  <Text style={styles.mockBadgeText}>MOCK STT</Text>
                </View>
              )}
            </View>
            <Text style={styles.transcriptText}>
              "{transcript}"
            </Text>

            {isMockResult && (
              <Text style={styles.mockHint}>
                💡 Add your GROQ_API_KEY in backend/.env.local for live Whisper transcription.
              </Text>
            )}

            <TouchableOpacity
              style={styles.actionButton}
              onPress={startListening}
            >
              <Text style={styles.actionButtonText}>Speak Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Error Card */}
        {appState === 'error' && errorMessage && (
          <View style={[styles.card, styles.errorCard]}>
            <Text style={styles.errorTitle}>Transcription Failed</Text>
            <Text style={styles.errorBody}>{errorMessage}</Text>
            <View style={styles.errorActions}>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={startListening}
              >
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.configButton}
                onPress={() => setConfigModalVisible(true)}
              >
                <Text style={styles.configButtonText}>Check Connection</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Info Footer */}
        <View style={styles.footerInfo}>
          <Text style={styles.footerText}>
            Backend: {config.backendUrl}
          </Text>
          <Text style={styles.footerNote}>
            • Auto-stops after 1.5s of silence (VAD) or 30s limit
          </Text>
        </View>
      </ScrollView>

      {/* Connection Settings Modal */}
      <ConfigModal
        visible={configModalVisible}
        config={config}
        onSave={setConfig}
        onClose={() => setConfigModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0b0f19',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 24 : 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#38bdf8',
    letterSpacing: 1.5,
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  settingsButton: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  settingsButtonText: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '600',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonContainer: {
    alignItems: 'center',
    marginVertical: 24,
  },
  mainButton: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#0284c7',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#38bdf8',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  mainButtonListening: {
    backgroundColor: '#dc2626',
    shadowColor: '#ef4444',
  },
  mainButtonThinking: {
    backgroundColor: '#d97706',
    shadowColor: '#f59e0b',
  },
  micIcon: {
    fontSize: 44,
    color: '#ffffff',
  },
  buttonLabel: {
    marginTop: 14,
    fontSize: 14,
    color: '#cbd5e1',
    fontWeight: '600',
  },
  card: {
    width: '100%',
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  mockBadge: {
    backgroundColor: '#3b2505',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#b45309',
  },
  mockBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fbbf24',
  },
  transcriptText: {
    fontSize: 17,
    lineHeight: 24,
    color: '#f8fafc',
    fontWeight: '500',
  },
  mockHint: {
    marginTop: 10,
    fontSize: 12,
    color: '#fbbf24',
    lineHeight: 18,
  },
  actionButton: {
    marginTop: 16,
    backgroundColor: '#1e293b',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  actionButtonText: {
    color: '#38bdf8',
    fontSize: 14,
    fontWeight: '600',
  },
  errorCard: {
    borderColor: '#7f1d1d',
    backgroundColor: '#1a0d0d',
  },
  errorTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f87171',
    marginBottom: 6,
  },
  errorBody: {
    fontSize: 13,
    color: '#cbd5e1',
    lineHeight: 18,
    marginBottom: 14,
  },
  errorActions: {
    flexDirection: 'row',
    gap: 10,
  },
  retryButton: {
    backgroundColor: '#dc2626',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  configButton: {
    backgroundColor: '#262626',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  configButtonText: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '600',
  },
  footerInfo: {
    marginTop: 'auto',
    paddingTop: 24,
    alignItems: 'center',
    width: '100%',
  },
  footerText: {
    fontSize: 11,
    color: '#475569',
    marginBottom: 4,
  },
  footerNote: {
    fontSize: 11,
    color: '#475569',
  },
});
