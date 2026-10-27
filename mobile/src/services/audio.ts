import { Audio } from 'expo-av';
import { RECORDING_LIMITS } from '../config/constants';

export interface AudioLevelUpdate {
  meteringDb: number;
  normalizedLevel: number; // 0.0 to 1.0 for UI animations
  durationMillis: number;
  hasSpoken: boolean;
  silenceElapsedMillis: number;
}

export class AudioService {
  private recording: Audio.Recording | null = null;
  private hasSpoken: boolean = false;
  private lastVoiceTimestamp: number = 0;
  private isRecordingActive: boolean = false;
  private onSilenceTrigger?: () => void;
  private onLevelUpdate?: (update: AudioLevelUpdate) => void;

  /**
   * Request microphone permission from the user
   */
  async requestPermission(): Promise<boolean> {
    try {
      const response = await Audio.requestPermissionsAsync();
      return response.granted;
    } catch (error) {
      console.error('[PAA Audio] Failed to request mic permission:', error);
      return false;
    }
  }

  /**
   * Start recording with metering and automatic silence detection (VAD).
   */
  async startRecording(callbacks: {
    onSilenceTrigger: () => void;
    onLevelUpdate: (update: AudioLevelUpdate) => void;
  }): Promise<void> {
    this.onSilenceTrigger = callbacks.onSilenceTrigger;
    this.onLevelUpdate = callbacks.onLevelUpdate;
    this.hasSpoken = false;
    this.lastVoiceTimestamp = 0;

    // Check permission
    const hasPermission = await this.requestPermission();
    if (!hasPermission) {
      throw new Error('Microphone permission was denied. Please allow microphone access in device settings.');
    }

    // Configure Audio session
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });

    // Custom recording options with metering enabled on both iOS and Android
    const recordingOptions: Audio.RecordingOptions = {
      isMeteringEnabled: true,
      android: {
        extension: '.m4a',
        outputFormat: Audio.AndroidOutputFormat.MPEG_4,
        audioEncoder: Audio.AndroidAudioEncoder.AAC,
        sampleRate: 44100,
        numberOfChannels: 1,
        bitRate: 128000,
      },
      ios: {
        extension: '.m4a',
        outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
        audioQuality: Audio.IOSAudioQuality.HIGH,
        sampleRate: 44100,
        numberOfChannels: 1,
        bitRate: 128000,
        linearPCMBitDepth: 16,
        linearPCMIsBigEndian: false,
        linearPCMIsFloat: false,
      },
      web: {
        mimeType: 'audio/webm',
        bitsPerSecond: 128000,
      },
    };

    const { recording } = await Audio.Recording.createAsync(
      recordingOptions,
      this.handleRecordingStatusUpdate,
      RECORDING_LIMITS.METERING_INTERVAL_MS
    );

    this.recording = recording;
    this.isRecordingActive = true;
  }

  private handleRecordingStatusUpdate = (status: Audio.RecordingStatus) => {
    if (!status.isRecording || !this.isRecordingActive) return;

    const now = Date.now();
    const db = status.metering ?? -160;

    // Normalize dB (typically -60dB to 0dB) into 0.0 - 1.0 range for UI
    const minDb = -60;
    const clampedDb = Math.max(minDb, Math.min(0, db));
    const normalizedLevel = (clampedDb - minDb) / -minDb; // 0 (silent) to 1 (loud)

    // Voice activity detection
    const isVoiceNow = db > RECORDING_LIMITS.VOICE_ACTIVITY_THRESHOLD_DB;

    if (isVoiceNow) {
      this.hasSpoken = true;
      this.lastVoiceTimestamp = now;
    }

    const silenceElapsedMillis =
      this.hasSpoken && this.lastVoiceTimestamp > 0
        ? now - this.lastVoiceTimestamp
        : 0;

    // Notify UI of audio levels
    if (this.onLevelUpdate) {
      this.onLevelUpdate({
        meteringDb: db,
        normalizedLevel,
        durationMillis: status.durationMillis,
        hasSpoken: this.hasSpoken,
        silenceElapsedMillis,
      });
    }

    // 1. Auto-stop if 1.5s of silence after speech detected
    if (
      this.hasSpoken &&
      silenceElapsedMillis >= RECORDING_LIMITS.SILENCE_DURATION_MS
    ) {
      if (this.isRecordingActive) {
        this.isRecordingActive = false;
        if (this.onSilenceTrigger) {
          this.onSilenceTrigger();
        }
      }
      return;
    }

    // 2. Auto-stop if max duration (30s) reached
    if (status.durationMillis >= RECORDING_LIMITS.MAX_RECORDING_DURATION_MS) {
      if (this.isRecordingActive) {
        this.isRecordingActive = false;
        if (this.onSilenceTrigger) {
          this.onSilenceTrigger();
        }
      }
    }
  };

  /**
   * Stop recording and return the saved audio file URI
   */
  async stopRecording(): Promise<string | null> {
    this.isRecordingActive = false;

    if (!this.recording) {
      return null;
    }

    try {
      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();
      this.recording = null;

      // Reset audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      return uri;
    } catch (error) {
      console.error('[PAA Audio] Error stopping recording:', error);
      this.recording = null;
      return null;
    }
  }

  /**
   * Cancel and discard current recording
   */
  async cancelRecording(): Promise<void> {
    this.isRecordingActive = false;
    if (!this.recording) return;

    try {
      await this.recording.stopAndUnloadAsync();
    } catch {
      // ignore cancel error
    } finally {
      this.recording = null;
    }
  }
}

export const audioService = new AudioService();
