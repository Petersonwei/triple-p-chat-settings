import React, { useState, useEffect, useRef } from 'react';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';

function App() {
  const [messages, setMessages] = useState(() => {
    const savedMessages = localStorage.getItem('chatMessages');
    return savedMessages ? JSON.parse(savedMessages) : [];
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [threadId, setThreadId] = useState(() => {
    return localStorage.getItem('threadId') || null;
  });
  const [isWaitingForWakeWord, setIsWaitingForWakeWord] = useState(true);
  const chatEndRef = useRef(null);

  // Load chat history when component mounts
  useEffect(() => {
    const loadChatHistory = async () => {
      if (threadId) {
        setIsLoading(true);
        try {
          const response = await fetch(`https://s4789280-triple-p-chat.uqcloud.net/api/chat/history/${threadId}`, {
            method: 'GET',
            credentials: 'include',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            }
          });

          // Check if redirected to login page
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('text/html')) {
            console.log('Session expired or not authenticated');
            setThreadId(null);
            setMessages([]);
            return;
          }

          if (response.ok) {
            const data = await response.json();
            setMessages(data.messages || []);
          } else {
            console.log('Error status:', response.status);
            setThreadId(null);
            setMessages([]);
          }
        } catch (error) {
          console.error('Error loading chat history:', error);
          setThreadId(null);
          setMessages([]);
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadChatHistory();
  }, []); // Run only once when component mounts

  // Callback for speech recognition results
  const onSpeechResult = (text) => {
    setInput(text);
    handleSend(text);
  };

  // Initialize speech recognition using the custom hook
  const {
    isListening,
    initializeRecognition,
    startListening,
    stopListening,
    isWaitingForWakeWord: wakeWordStatus,
  } = useSpeechRecognition(onSpeechResult);

  useEffect(() => {
    initializeRecognition();
  }, [initializeRecognition]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    localStorage.setItem('chatMessages', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    if (threadId) {
      localStorage.setItem('threadId', threadId);
    } else {
      localStorage.removeItem('threadId');
    }
  }, [threadId]);

  const handleSend = async (text = input) => {
    if (!text.trim()) return;

    setIsLoading(true);
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setInput('');

    try {
      const response = await fetch('https://s4789280-triple-p-chat.uqcloud.net/api/chat', {
        method: 'POST',
        credentials: 'include',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          message: text,
          threadId: threadId
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Server response:', errorData);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setThreadId(data.threadId);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: data.message 
      }]);
    } catch (error) {
      console.error('Error details:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Error: Unable to connect to the server. Please try again later.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    setThreadId(null);
    localStorage.removeItem('chatMessages');
    localStorage.removeItem('threadId');
  };

  return (
    <div className="App">
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
        <h1 style={{ textAlign: 'center' }}>AI Assistant Chat</h1>
        
        <div style={{ 
          textAlign: 'center', 
          marginBottom: '10px',
          color: wakeWordStatus ? '#666' : '#28a745'
        }}>
          {wakeWordStatus ? 'Waiting for "Hey Assistant"...' : 'Listening for commands...'}
        </div>

        <button
          onClick={handleClearChat}
          style={{
            marginBottom: '10px',
            padding: '5px 10px',
            backgroundColor: '#dc3545',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Clear Chat
        </button>

        <div
          style={{
            border: '1px solid #ddd',
            borderRadius: '8px',
            padding: '10px',
            height: '400px',
            overflowY: 'auto',
            marginBottom: '20px',
          }}
        >
          {messages.map((message, index) => (
            <div
              key={index}
              style={{
                textAlign: message.role === 'user' ? 'right' : 'left',
                marginBottom: '10px',
              }}
            >
              <div
                style={{
                  display: 'inline-block',
                  padding: '10px',
                  borderRadius: '8px',
                  backgroundColor: message.role === 'user' ? '#007bff' : '#f1f1f1',
                  color: message.role === 'user' ? '#fff' : '#000',
                }}
              >
                {message.content}
              </div>
            </div>
          ))}
          <div ref={chatEndRef}></div>
        </div>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <button
            onClick={startListening}
            disabled={isListening}
            style={{
              padding: '10px 20px',
              backgroundColor: isListening ? '#aaa' : '#007bff',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            {isListening ? 'Listening...' : 'Start Listening'}
          </button>
          <button
            onClick={stopListening}
            disabled={!isListening}
            style={{
              padding: '10px 20px',
              backgroundColor: '#f00',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Stop Listening
          </button>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            style={{
              flex: '1',
              padding: '10px',
              borderRadius: '4px',
              border: '1px solid #ddd',
            }}
          />
          <button
            onClick={() => handleSend()}
            disabled={isLoading}
            style={{
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            {isLoading ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
