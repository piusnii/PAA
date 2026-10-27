import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AppState } from '../types';

interface StateIndicatorProps {
  state: AppState;
  silenceElapsedMillis?: number;
}

export const StateIndicator: React.FC<StateIndicatorProps> = ({
  state,
  silenceElapsedMillis = 0,
}) => {
  const getBadgeConfig = () => {
    switch (state) {
      case 'idle':
        return {
          label: 'IDLE',
          color: '#64748b',
          bg: '#1e293b',
          dot: '#94a3b8',
          description: 'Tap the microphone or say wake phrase',
        };
      case 'listening':
        const silenceSec = (silenceElapsedMillis / 1000).toFixed(1);
        return {
          label: 'LISTENING',
          color: '#38bdf8',
          bg: '#082f49',
          dot: '#38bdf8',
          description:
            silenceElapsedMillis > 300
              ? `Silence detected (${silenceSec}s / 1.5s)...`
              : 'Listening to your voice...',
        };
      case 'thinking':
        return {
          label: 'THINKING',
          color: '#fbbf24',
          bg: '#451a03',
          dot: '#fbbf24',
          description: 'Transcribing with Groq Whisper...',
        };
      case 'done':
        return {
          label: 'DONE',
          color: '#4ade80',
          bg: '#052e16',
          dot: '#4ade80',
          description: 'Voice transcript ready',
        };
      case 'error':
        return {
          label: 'ERROR',
          color: '#f87171',
          bg: '#450a0a',
          dot: '#f87171',
          description: 'Something went wrong',
        };
    }
  };

  const config = getBadgeConfig();

  return (
    <View style={styles.container}>
      <View style={[styles.badge, { backgroundColor: config.bg, borderColor: config.color }]}>
        <View style={[styles.dot, { backgroundColor: config.dot }]} />
        <Text style={[styles.badgeText, { color: config.color }]}>{config.label}</Text>
      </View>
      <Text style={styles.description}>{config.description}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 9999,
    borderWidth: 1,
    marginBottom: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  description: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
  },
});
