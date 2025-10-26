import React, { useState, useEffect, useRef } from 'react';
import { ElasticAgentService, ChatMessage as ChatMessageType, ElasticAgentConfig } from '../services/elasticAgentService';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import './ChatApp.css';

const ChatApp: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const agentServiceRef = useRef<ElasticAgentService | null>(null);

  // Initialize the Elastic Agent Service
  useEffect(() => {
    const config: ElasticAgentConfig = {
      kibanaUrl: process.env.REACT_APP_KIBANA_URL || 'http://localhost:5601',
      agentId: process.env.REACT_APP_AGENT_ID || 'your-agent-id',
      apiKey: process.env.REACT_APP_API_KEY || 'your-api-key',
    };
    
    agentServiceRef.current = new ElasticAgentService(config);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleResetConversation = () => {
    if (agentServiceRef.current) {
      agentServiceRef.current.resetConversation();
      setMessages([]);
      setError(null);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!agentServiceRef.current) {
      setError('Agent service not initialized');
      return;
    }

    const userMessage: ChatMessageType = {
      id: Date.now().toString(),
      content,
      role: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    // Create assistant message for streaming
    const assistantMessageId = (Date.now() + 1).toString();
    const reasoningMessageId = (Date.now() + 2).toString();

    try {
      await agentServiceRef.current.sendMessage(
        content,
        // onChunk - this will be called for each text_chunk
        (chunk: string) => {
          console.log('Received chunk in UI:', chunk);
          
          // Remove any existing reasoning message when we start getting actual content
          setMessages(prev => prev.filter(msg => !msg.isTransient));
          
          // Add or update the assistant message
          setMessages(prev => {
            const existingAssistantIndex = prev.findIndex(msg => msg.id === assistantMessageId);
            if (existingAssistantIndex >= 0) {
              // Update existing message
              return prev.map(msg => 
                msg.id === assistantMessageId 
                  ? { ...msg, content: msg.content + chunk }
                  : msg
              );
            } else {
              // Create new assistant message
              const assistantMessage: ChatMessageType = {
                id: assistantMessageId,
                content: chunk,
                role: 'assistant',
                timestamp: new Date(),
                isStreaming: true,
              };
              return [...prev, assistantMessage];
            }
          });
        },
        // onComplete - called when streaming is done
        () => {
          console.log('Streaming complete in UI');
          setMessages(prev => 
            prev.map(msg => 
              msg.id === assistantMessageId 
                ? { ...msg, isStreaming: false }
                : msg
            )
          );
          setIsLoading(false);
        },
        // onError - called if there's an error
        (error: Error) => {
          console.error('Error in UI:', error);
          setError(error.message);
          setMessages(prev => prev.filter(msg => msg.id !== assistantMessageId && msg.id !== reasoningMessageId));
          setIsLoading(false);
        },
        // onReasoning - called for reasoning events
        (reasoning: string) => {
          console.log('Received reasoning in UI:', reasoning);
          
          setMessages(prev => {
            // Remove any existing reasoning message
            const filteredMessages = prev.filter(msg => !msg.isTransient);
            
            // Add new reasoning message
            const reasoningMessage: ChatMessageType = {
              id: reasoningMessageId,
              content: reasoning,
              role: 'reasoning',
              timestamp: new Date(),
              isTransient: true,
              isStreaming: true,
            };
            
            return [...filteredMessages, reasoningMessage];
          });
        }
      );
    } catch (err) {
      console.error('Catch error in UI:', err);
      setError('Failed to send message');
      setMessages(prev => prev.filter(msg => msg.id !== assistantMessageId));
      setIsLoading(false);
    }
  };

  return (
    <div className="chat-app">
      <header className="chat-header">
        <div className="header-content">
          <div className="header-top">
            <div className="nxp-logo">
              <h1>NXP AI Assistant</h1>
            </div>
            <button 
              className="nxp-button reset-button" 
              onClick={handleResetConversation}
              disabled={isLoading}
            >
              New Conversation
            </button>
          </div>
          <div className="header-subtitle">
            Powered by Elasticsearch Agent Builder
          </div>
        </div>
      </header>

      <main className="chat-main">
        <div className="messages-container">
          {messages.length === 0 && (
            <div className="welcome-message">
              <h2>Welcome to NXP AI Assistant</h2>
              <p>Ask me anything about NXP products, technologies, or general questions.</p>
            </div>
          )}
          
          {messages.map(message => (
            <ChatMessage key={message.id} message={message} />
          ))}
          
          {error && (
            <div className="error-message">
              <strong>Error:</strong> {error}
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </main>

      <ChatInput 
        onSendMessage={handleSendMessage}
        disabled={isLoading}
        placeholder={isLoading ? "AI is thinking..." : "Ask me anything..."}
      />
    </div>
  );
};

export default ChatApp;