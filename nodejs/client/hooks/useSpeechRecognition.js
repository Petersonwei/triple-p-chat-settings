import { useRef, useCallback, useState } from 'react';

export const useSpeechRecognition = (onResult) => {
  const [isListening, setIsListening] = useState(false);
  const [isWaitingForWakeWord, setIsWaitingForWakeWord] = useState(true);
  const recognition = useRef(null);

  const initializeRecognition = useCallback(() => {
    if (recognition.current) return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition.current = new SpeechRecognition();
    recognition.current.continuous = true;
    recognition.current.interimResults = true;
    recognition.current.maxAlternatives = 1;
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
        onResult(transcript);
      }
    };

    recognition.current.onend = () => {
      if (isListening) {
        try {
          recognition.current.start();
        } catch (error) {
          console.error('Error restarting recognition:', error);
          setIsListening(false);
          setIsWaitingForWakeWord(true);
        }
      } else {
        setIsListening(false);
        setIsWaitingForWakeWord(true);
      }
    };

    recognition.current.onerror = (event) => {
      console.error('Recognition error:', event.error);
      setIsListening(false);
      setIsWaitingForWakeWord(true);
    };
  }, [onResult, isListening, isWaitingForWakeWord]);

  const startListening = useCallback(() => {
    if (!recognition.current) return;
    try {
      recognition.current.start();
      setIsListening(true);
      setIsWaitingForWakeWord(true);
    } catch (error) {
      console.error('Error starting recognition:', error);
      setIsListening(false);
      setIsWaitingForWakeWord(true);
      if (error.message.includes('already started')) {
        recognition.current.stop();
        setTimeout(() => {
          try {
            recognition.current.start();
            setIsListening(true);
            setIsWaitingForWakeWord(true);
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
      setIsWaitingForWakeWord(true);
    } catch (error) {
      console.error('Error stopping recognition:', error);
    }
  }, []);

  return {
    isListening,
    initializeRecognition,
    startListening,
    stopListening,
    isWaitingForWakeWord,
  };
};
