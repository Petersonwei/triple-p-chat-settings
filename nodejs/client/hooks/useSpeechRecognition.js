import { useRef, useCallback, useState } from 'react';

export const useSpeechRecognition = (onResult) => {
  const [isListening, setIsListening] = useState(false);
  const recognition = useRef(null);

  const initializeRecognition = useCallback(() => {
    if (recognition.current) return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition.current = new SpeechRecognition();
    recognition.current.continuous = true; // Changed to true to keep listening
    recognition.current.interimResults = false;
    recognition.current.lang = 'en-US';

    recognition.current.onresult = (event) => {
      // Get the last result
      const lastResultIndex = event.results.length - 1;
      const transcript = event.results[lastResultIndex][0].transcript;
      onResult(transcript);
    };

    recognition.current.onend = () => {
      // Automatically restart if still in listening mode
      if (isListening) {
        try {
          recognition.current.start();
        } catch (error) {
          console.error('Error restarting recognition:', error);
          setIsListening(false);
        }
      } else {
        setIsListening(false);
      }
    };

    recognition.current.onerror = (event) => {
      console.error('Recognition error:', event.error);
      setIsListening(false);
    };
  }, [onResult, isListening]);

  const startListening = useCallback(() => {
    if (!recognition.current) return;
    try {
      recognition.current.start();
      setIsListening(true);
    } catch (error) {
      console.error('Error starting recognition:', error);
      setIsListening(false);
      if (error.message.includes('already started')) {
        recognition.current.stop();
        setTimeout(() => {
          try {
            recognition.current.start();
            setIsListening(true);
          } catch (e) {
            console.error('Error restarting recognition:', e);
          }
        }, 100);
      }
    }
  }, []);

  const stopListening = useCallback(() => {
    if (!recognition.current) return;
    try {
      recognition.current.stop();
      setIsListening(false);
    } catch (error) {
      console.error('Error stopping recognition:', error);
    }
  }, []);

  return {
    isListening,
    initializeRecognition,
    startListening,
    stopListening,
  };
};
