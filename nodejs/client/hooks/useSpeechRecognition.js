// Import required React hooks
import { useRef, useCallback, useState, useEffect } from 'react';

// Custom hook for speech recognition functionality
export const useSpeechRecognition = (onResult) => {
  // State to track if speech recognition is active
  const [isListening, setIsListening] = useState(false);
  // State to track if waiting for wake word
  const [isWaitingForWakeWord, setIsWaitingForWakeWord] = useState(true);
  // Ref to store speech recognition instance
  const recognition = useRef(null);

  // Initialize speech recognition with required settings
  const initializeRecognition = useCallback(() => {
    if (recognition.current) return;
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition.current = new SpeechRecognition();
    recognition.current.continuous = true;
    recognition.current.interimResults = false;
    recognition.current.lang = 'en-US';

    recognition.current.onresult = (event) => {
      const lastResultIndex = event.results.length - 1;
      const transcript = event.results[lastResultIndex][0].transcript.trim().toLowerCase();
      console.log('Detected speech:', transcript);
      
      if (isWaitingForWakeWord) {
        if (transcript.includes('hey') && transcript.includes('assistant')) {
          setIsWaitingForWakeWord(false);
          console.log('Wake word detected! Ready to chat.');
        }
      } else {
        console.log('Sending to GPT:', transcript);
        onResult(transcript);
        setIsWaitingForWakeWord(true);
      }
    };

    recognition.current.onend = () => {
      console.log('Speech recognition ended');
      if (isListening) {
        console.log('Restarting recognition because isListening is true');
        try {
          recognition.current.start();
        } catch (error) {
          console.error('Error in onend restart:', error);
          setIsListening(false);
        }
      }
    };

    recognition.current.onerror = (event) => {
      console.error('Recognition error:', event.error);
      if (event.error === 'not-allowed') {
        setIsListening(false);
      }
    };
  }, [onResult, isListening]);

  const startListening = useCallback(() => {
    if (!recognition.current) {
      initializeRecognition();
    }

    if (recognition.current && !isListening) {
      try {
        recognition.current.start();
        setIsListening(true);
        setIsWaitingForWakeWord(true);
      } catch (error) {
        console.error('Error in startListening:', error);
      }
    }
  }, [initializeRecognition, isListening]);

  const stopListening = useCallback(() => {
    if (recognition.current && isListening) {
      try {
        recognition.current.stop();
        setIsListening(false);
        setIsWaitingForWakeWord(true);
      } catch (error) {
        console.error('Error in stopListening:', error);
      }
    }
  }, [isListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognition.current) {
        try {
          recognition.current.stop();
        } catch (error) {
          console.error('Error in cleanup:', error);
        }
      }
    };
  }, []);

  return {
    isListening,
    initializeRecognition,
    startListening,
    stopListening,
    isWaitingForWakeWord,
  };
};
