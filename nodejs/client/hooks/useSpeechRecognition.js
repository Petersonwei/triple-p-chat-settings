import { useRef, useCallback, useState } from 'react';

export const useSpeechRecognition = (onResult) => {
  const [isListening, setIsListening] = useState(false);
  const recognition = useRef(null);

  const initializeRecognition = useCallback(() => {
    if (recognition.current) return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition.current = new SpeechRecognition();
    recognition.current.continuous = false;
    recognition.current.interimResults = false;
    recognition.current.lang = 'en-US';

    recognition.current.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      onResult(transcript);
    };

    recognition.current.onend = () => {
      setIsListening(false);
    };

    recognition.current.onerror = (event) => {
      console.error('Recognition error:', event.error);
      setIsListening(false);
    };
  }, [onResult]);

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
