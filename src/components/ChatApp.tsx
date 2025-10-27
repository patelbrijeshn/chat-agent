import React, { useState, useEffect, useRef } from 'react';
import { ElasticAgentService, ChatMessage as ChatMessageType, ElasticAgentConfig } from '../services/elasticAgentService';
import NXPHeader from './NXPHeader';
import SearchInterface from './SearchInterface';
import StickySearchBar from './StickySearchBar';
import SearchTitle from './SearchTitle';
import ChatMessage from './ChatMessage';
import './ChatApp.css';

interface ConversationSection {
  id: string;
  query: string;
  messages: ChatMessageType[];
}

const ChatApp: React.FC = () => {
  const [conversationSections, setConversationSections] = useState<ConversationSection[]>([]);
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
    if (conversationSections.length > 0) {
      // Add some delay to ensure the message is rendered before scrolling
      setTimeout(scrollToBottom, 100);
    }
  }, [conversationSections]);

  const handleResetConversation = () => {
    if (agentServiceRef.current) {
      agentServiceRef.current.resetConversation();
      setConversationSections([]);
      setError(null);
    }
  };

  const handleSearch = async (content: string) => {
    if (!agentServiceRef.current) {
      setError('Agent service not initialized');
      return;
    }

    // Create a new conversation section
    const sectionId = Date.now().toString();
    const newSection: ConversationSection = {
      id: sectionId,
      query: content,
      messages: []
    };

    setConversationSections(prev => [...prev, newSection]);
    setIsLoading(true);
    setError(null);

    const assistantMessageId = (Date.now() + 1).toString();
    const reasoningMessageId = (Date.now() + 2).toString();

    try {
      await agentServiceRef.current.sendMessage(
        content,
        // onChunk
        (chunk: string) => {
          console.log('Received chunk in UI:', chunk);
          
          // Remove any existing reasoning message from the current section
          setConversationSections(prev => 
            prev.map(section => 
              section.id === sectionId 
                ? { ...section, messages: section.messages.filter(msg => !msg.isTransient) }
                : section
            )
          );
          
          // Add or update the assistant message in the current section
          setConversationSections(prev => 
            prev.map(section => {
              if (section.id !== sectionId) return section;
              
              const existingAssistantIndex = section.messages.findIndex(msg => msg.id === assistantMessageId);
              if (existingAssistantIndex >= 0) {
                // Update existing message
                return {
                  ...section,
                  messages: section.messages.map(msg => 
                    msg.id === assistantMessageId 
                      ? { ...msg, content: msg.content + chunk }
                      : msg
                  )
                };
              } else {
                // Create new assistant message
                const assistantMessage: ChatMessageType = {
                  id: assistantMessageId,
                  content: chunk,
                  role: 'assistant',
                  timestamp: new Date(),
                  isStreaming: true,
                };
                return {
                  ...section,
                  messages: [...section.messages, assistantMessage]
                };
              }
            })
          );
        },
        // onComplete
        () => {
          console.log('Streaming complete in UI');
          setConversationSections(prev => 
            prev.map(section => 
              section.id === sectionId 
                ? {
                    ...section,
                    messages: section.messages.map(msg => 
                      msg.id === assistantMessageId 
                        ? { ...msg, isStreaming: false }
                        : msg
                    )
                  }
                : section
            )
          );
          setIsLoading(false);
        },
        // onError
        (error: Error) => {
          console.error('Error in UI:', error);
          setError(error.message);
          setConversationSections(prev => 
            prev.map(section => 
              section.id === sectionId 
                ? {
                    ...section,
                    messages: section.messages.filter(msg => msg.id !== assistantMessageId && msg.id !== reasoningMessageId)
                  }
                : section
            )
          );
          setIsLoading(false);
        },
        // onReasoning
        (reasoning: string) => {
          console.log('Received reasoning in UI:', reasoning);
          
          setConversationSections(prev => 
            prev.map(section => {
              if (section.id !== sectionId) return section;
              
              // Remove any existing reasoning message
              const filteredMessages = section.messages.filter(msg => !msg.isTransient);
              
              // Add new reasoning message
              const reasoningMessage: ChatMessageType = {
                id: reasoningMessageId,
                content: reasoning,
                role: 'reasoning',
                timestamp: new Date(),
                isTransient: true,
                isStreaming: true,
              };
              
              return {
                ...section,
                messages: [...filteredMessages, reasoningMessage]
              };
            })
          );
        }
      );
    } catch (err) {
      console.error('Catch error in UI:', err);
      setError('Failed to send message');
      setConversationSections(prev => 
        prev.map(section => 
          section.id === sectionId 
            ? {
                ...section,
                messages: section.messages.filter(msg => msg.id !== assistantMessageId && msg.id !== reasoningMessageId)
              }
            : section
        )
      );
      setIsLoading(false);
    }
  };

  const hasMessages = conversationSections.length > 0;

  return (
    <div className="chat-app">
      <NXPHeader onNewConversation={handleResetConversation} />
      
      <main className="chat-main">
        <SearchInterface 
          onSearch={handleSearch}
          disabled={isLoading}
          hasMessages={hasMessages}
        />
        
        {hasMessages && (
          <div className="conversation-container">
            {conversationSections.map((section, sectionIndex) => (
              <div key={section.id} className="conversation-section">
                <SearchTitle 
                  query={section.query} 
                  isFirstSection={sectionIndex === 0}
                />
                
                <div className="section-messages">
                  {section.messages.map(message => (
                    <ChatMessage key={message.id} message={message} />
                  ))}
                </div>
              </div>
            ))}
            
            {error && (
              <div className="error-message">
                <strong>Error:</strong> {error}
              </div>
            )}
            
            <div ref={messagesEndRef} />
            <div className="bottom-spacer" />
          </div>
        )}
      </main>

      {/* Show sticky search bar only when there are messages */}
      {hasMessages && (
        <StickySearchBar 
          onSearch={handleSearch}
          disabled={isLoading}
        />
      )}
    </div>
  );
};

export default ChatApp;