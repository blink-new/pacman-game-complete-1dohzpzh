import { useRef, useCallback, useEffect } from 'react';

interface SoundManager {
  playSound: (soundName: string) => void;
  stopSound: (soundName: string) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  isMuted: boolean;
}

export const useSoundManager = (): SoundManager => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const soundsRef = useRef<{ [key: string]: HTMLAudioElement }>({});
  const volumeRef = useRef(0.3);
  const isMutedRef = useRef(false);

  // Initialize audio context and sounds
  useEffect(() => {
    // Create audio context
    try {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.warn('Web Audio API not supported');
    }

    // Create sound effects using Web Audio API for better browser compatibility
    const createBeepSound = (frequency: number, duration: number, type: OscillatorType = 'square') => {
      return () => {
        if (!audioContextRef.current || isMutedRef.current) return;
        
        const oscillator = audioContextRef.current.createOscillator();
        const gainNode = audioContextRef.current.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContextRef.current.destination);
        
        oscillator.frequency.setValueAtTime(frequency, audioContextRef.current.currentTime);
        oscillator.type = type;
        
        gainNode.gain.setValueAtTime(0, audioContextRef.current.currentTime);
        gainNode.gain.linearRampToValueAtTime(volumeRef.current * 0.1, audioContextRef.current.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContextRef.current.currentTime + duration);
        
        oscillator.start(audioContextRef.current.currentTime);
        oscillator.stop(audioContextRef.current.currentTime + duration);
      };
    };

    const createComplexSound = (frequencies: number[], durations: number[], type: OscillatorType = 'square') => {
      return () => {
        if (!audioContextRef.current || isMutedRef.current) return;
        
        let currentTime = audioContextRef.current.currentTime;
        
        frequencies.forEach((freq, index) => {
          const oscillator = audioContextRef.current!.createOscillator();
          const gainNode = audioContextRef.current!.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContextRef.current!.destination);
          
          oscillator.frequency.setValueAtTime(freq, currentTime);
          oscillator.type = type;
          
          const duration = durations[index] || 0.1;
          
          gainNode.gain.setValueAtTime(0, currentTime);
          gainNode.gain.linearRampToValueAtTime(volumeRef.current * 0.1, currentTime + 0.01);
          gainNode.gain.exponentialRampToValueAtTime(0.001, currentTime + duration);
          
          oscillator.start(currentTime);
          oscillator.stop(currentTime + duration);
          
          currentTime += duration;
        });
      };
    };

    // Define sound effects
    const sounds = {
      // Pacman movement (chomp)
      chomp: createBeepSound(800, 0.1, 'square'),
      
      // Power pellet eaten
      powerPellet: createComplexSound([400, 500, 600, 700], [0.1, 0.1, 0.1, 0.2], 'sine'),
      
      // Ghost eaten
      ghostEaten: createComplexSound([800, 1000, 1200, 1400], [0.05, 0.05, 0.05, 0.1], 'sawtooth'),
      
      // Pacman death
      death: createComplexSound([500, 400, 300, 200, 100], [0.2, 0.2, 0.2, 0.2, 0.4], 'triangle'),
      
      // Level complete
      levelComplete: createComplexSound([523, 659, 784, 1047], [0.2, 0.2, 0.2, 0.4], 'sine'),
      
      // Game start
      gameStart: createComplexSound([262, 330, 392, 523], [0.15, 0.15, 0.15, 0.3], 'square'),
      
      // Power mode (siren-like)
      powerMode: () => {
        if (!audioContextRef.current || isMutedRef.current) return;
        
        const oscillator = audioContextRef.current.createOscillator();
        const gainNode = audioContextRef.current.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContextRef.current.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(200, audioContextRef.current.currentTime);
        oscillator.frequency.linearRampToValueAtTime(400, audioContextRef.current.currentTime + 0.5);
        oscillator.frequency.linearRampToValueAtTime(200, audioContextRef.current.currentTime + 1);
        
        gainNode.gain.setValueAtTime(volumeRef.current * 0.05, audioContextRef.current.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContextRef.current.currentTime + 1);
        
        oscillator.start();
        oscillator.stop(audioContextRef.current.currentTime + 1);
      }
    };

    // Store sound functions
    Object.entries(sounds).forEach(([name, soundFn]) => {
      (soundsRef.current as any)[name] = soundFn;
    });

    return () => {
      // Cleanup
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  const playSound = useCallback((soundName: string) => {
    if (isMutedRef.current) return;
    
    const sound = (soundsRef.current as any)[soundName];
    if (sound && typeof sound === 'function') {
      try {
        // Resume audio context if suspended (required by some browsers)
        if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume();
        }
        sound();
      } catch (error) {
        console.warn(`Failed to play sound: ${soundName}`, error);
      }
    }
  }, []);

  const stopSound = useCallback((soundName: string) => {
    // For Web Audio API, sounds stop automatically, but we keep this for interface consistency
  }, []);

  const setVolume = useCallback((volume: number) => {
    volumeRef.current = Math.max(0, Math.min(1, volume));
  }, []);

  const toggleMute = useCallback(() => {
    isMutedRef.current = !isMutedRef.current;
  }, []);

  return {
    playSound,
    stopSound,
    setVolume,
    toggleMute,
    isMuted: isMutedRef.current
  };
};