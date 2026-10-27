import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

interface AudioVisualizerProps {
  level: number; // 0.0 to 1.0
  isListening: boolean;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ level, isListening }) => {
  const animatedLevel = useRef(new Animated.Value(0.1)).current;

  useEffect(() => {
    Animated.spring(animatedLevel, {
      toValue: isListening ? Math.max(0.15, level) : 0.08,
      useNativeDriver: false,
      friction: 4,
      tension: 60,
    }).start();
  }, [level, isListening]);

  // Generate 7 sound wave bars with slightly different scaling factors
  const barMultipliers = [0.4, 0.7, 1.0, 1.3, 1.0, 0.7, 0.4];

  return (
    <View style={styles.container}>
      {barMultipliers.map((multiplier, index) => {
        const height = animatedLevel.interpolate({
          inputRange: [0, 1],
          outputRange: [6, 48 * multiplier],
        });

        return (
          <Animated.View
            key={index}
            style={[
              styles.bar,
              {
                height,
                backgroundColor: isListening ? '#38bdf8' : '#334155',
              },
            ]}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 64,
    gap: 6,
    marginVertical: 10,
  },
  bar: {
    width: 6,
    borderRadius: 3,
    minHeight: 6,
  },
});
