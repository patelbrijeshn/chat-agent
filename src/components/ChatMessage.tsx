import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChatMessage as ChatMessageType } from '../services/elasticAgentService';
import './ChatMessage.css';

interface ChatMessageProps {
  message: ChatMessageType;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  return (
    <div className={`chat-message ${message.role} ${message.isTransient ? 'transient' : ''}`}>
      <div className="message-avatar">
        {message.role === 'user' ? (
          <div className="user-avatar">U</div>
        ) : message.role === 'reasoning' ? (
          <div className="reasoning-avatar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </div>
        ) : (
          <div className="assistant-avatar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
        )}
      </div>
      <div className="message-content">
        <div className="message-text">
          {message.role === 'reasoning' ? (
            <div className="reasoning-content">
              <div className="reasoning-label">Thinking...</div>
              <div className="reasoning-text">{message.content}</div>
            </div>
          ) : message.role === 'assistant' ? (
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({children}) => <h1 className="markdown-h1">{children}</h1>,
                h2: ({children}) => <h2 className="markdown-h2">{children}</h2>,
                h3: ({children}) => <h3 className="markdown-h3">{children}</h3>,
                h4: ({children}) => <h4 className="markdown-h4">{children}</h4>,
                p: ({children}) => <p className="markdown-p">{children}</p>,
                ul: ({children}) => <ul className="markdown-ul">{children}</ul>,
                ol: ({children}) => <ol className="markdown-ol">{children}</ol>,
                li: ({children}) => <li className="markdown-li">{children}</li>,
                strong: ({children}) => <strong className="markdown-strong">{children}</strong>,
                em: ({children}) => <em className="markdown-em">{children}</em>,
                code: ({children, className}) => {
                  const isInline = !className;
                  return isInline ? (
                    <code className="markdown-code-inline">{children}</code>
                  ) : (
                    <code className="markdown-code-block">{children}</code>
                  );
                },
                pre: ({children}) => <pre className="markdown-pre">{children}</pre>,
                blockquote: ({children}) => <blockquote className="markdown-blockquote">{children}</blockquote>,
                table: ({children}) => <table className="markdown-table">{children}</table>,
                thead: ({children}) => <thead className="markdown-thead">{children}</thead>,
                tbody: ({children}) => <tbody className="markdown-tbody">{children}</tbody>,
                tr: ({children}) => <tr className="markdown-tr">{children}</tr>,
                th: ({children}) => <th className="markdown-th">{children}</th>,
                td: ({children}) => <td className="markdown-td">{children}</td>,
              }}
            >
              {message.content}
            </ReactMarkdown>
          ) : (
            message.content
          )}
          {message.isStreaming && <span className="cursor">|</span>}
        </div>
        <div className="message-timestamp">
          {message.timestamp.toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;