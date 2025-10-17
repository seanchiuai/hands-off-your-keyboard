"use client";

import { useRef, useCallback, useEffect } from "react";

/**
 * Hook for handling audio input/output streaming
 * Used by voice shopping assistant for real-time audio communication
 */
export function useAudioStream() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioWorkletNodeRef = useRef<AudioWorkletNode | null>(null);
  const audioBufferQueueRef = useRef<AudioBuffer[]>([]);
  const isPlayingRef = useRef(false);

  /**
   * Initialize audio context (must be called after user interaction)
   */
  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext({ sampleRate: 16000 });
    }
    return audioContextRef.current;
  }, []);

  /**
   * Start capturing audio from microphone
   */
  const startCapture = useCallback(
    async (onAudioData: (audioData: ArrayBuffer) => void) => {
      try {
        const audioContext = initAudioContext();

        // Request microphone access
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 16000,
          },
        });

        mediaStreamRef.current = stream;

        // Create audio source from microphone
        const source = audioContext.createMediaStreamSource(stream);

        // Create script processor to capture audio data
        const processor = audioContext.createScriptProcessor(4096, 1, 1);

        processor.onaudioprocess = (event) => {
          const inputData = event.inputBuffer.getChannelData(0);
          // Convert Float32Array to ArrayBuffer for WebSocket transmission
          const buffer = new ArrayBuffer(inputData.length * 2); // 16-bit audio
          const view = new DataView(buffer);

          // Convert float32 to int16
          for (let i = 0; i < inputData.length; i++) {
            const s = Math.max(-1, Math.min(1, inputData[i]));
            view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
          }

          onAudioData(buffer);
        };

        source.connect(processor);
        processor.connect(audioContext.destination);

        return () => {
          processor.disconnect();
          source.disconnect();
          stream.getTracks().forEach((track) => track.stop());
        };
      } catch (error) {
        console.error("Error starting audio capture:", error);
        throw error;
      }
    },
    [initAudioContext]
  );

  /**
   * Stop capturing audio
   */
  const stopCapture = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioWorkletNodeRef.current) {
      audioWorkletNodeRef.current.disconnect();
      audioWorkletNodeRef.current = null;
    }
  }, []);

  /**
   * Play received audio data
   */
  const playAudio = useCallback(
    async (audioData: ArrayBuffer) => {
      try {
        const audioContext = initAudioContext();

        // Decode audio data
        const audioBuffer = await audioContext.decodeAudioData(audioData.slice(0));

        // Add to queue
        audioBufferQueueRef.current.push(audioBuffer);

        // Start playing if not already playing
        if (!isPlayingRef.current) {
          playNextInQueue();
        }
      } catch (error) {
        console.error("Error playing audio:", error);
      }
    },
    [initAudioContext]
  );

  /**
   * Play next audio buffer in queue
   */
  const playNextInQueue = useCallback(() => {
    if (audioBufferQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      return;
    }

    isPlayingRef.current = true;
    const audioContext = audioContextRef.current;
    if (!audioContext) return;

    const audioBuffer = audioBufferQueueRef.current.shift()!;
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);

    source.onended = () => {
      playNextInQueue();
    };

    source.start();
  }, []);

  /**
   * Stop playing audio and clear queue
   */
  const stopAudio = useCallback(() => {
    audioBufferQueueRef.current = [];
    isPlayingRef.current = false;
  }, []);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      stopCapture();
      stopAudio();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [stopCapture, stopAudio]);

  return {
    startCapture,
    stopCapture,
    playAudio,
    stopAudio,
    initAudioContext,
  };
}

