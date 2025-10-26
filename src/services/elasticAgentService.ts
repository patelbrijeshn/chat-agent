interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'reasoning';
  timestamp: Date;
  isStreaming?: boolean;
  isTransient?: boolean; // For reasoning messages that will be replaced
}

interface ElasticAgentConfig {
  kibanaUrl: string;
  agentId: string;
  apiKey: string;
}

interface ConverseResponse {
  conversation_id: string;
  response: string;
}

class ElasticAgentService {
  private config: ElasticAgentConfig;
  private conversationId: string | null = null;

  constructor(config: ElasticAgentConfig) {
    this.config = config;
  }

  private getApiUrl(): string {
    if (process.env.NODE_ENV === 'development') {
      return '/api/agent_builder/converse/async';
    }
    return `${this.config.kibanaUrl}/api/agent_builder/converse/async`;
  }

  async sendMessage(
    message: string,
    onChunk: (chunk: string) => void,
    onComplete: () => void,
    onError: (error: Error) => void,
    onReasoning?: (reasoning: string) => void // New callback for reasoning
  ): Promise<void> {
    try {
      const url = this.getApiUrl();

      const requestBody: any = {
        input: message,
        agent_id: this.config.agentId,
      };

      if (this.conversationId) {
        requestBody.conversation_id = this.conversationId;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `ApiKey ${this.config.apiKey}`,
          'kbn-xsrf': 'true',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      await this.handleStreamingResponse(response, onChunk, onComplete, onError, onReasoning);
    } catch (error) {
      console.error('Service error:', error);
      onError(error as Error);
    }
  }

  private async handleStreamingResponse(
    response: Response,
    onChunk: (chunk: string) => void,
    onComplete: () => void,
    onError: (error: Error) => void,
    onReasoning?: (reasoning: string) => void
  ): Promise<void> {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body reader available');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          onComplete();
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();
          
          if (trimmedLine === '' || trimmedLine.startsWith(':')) {
            continue;
          }

          if (trimmedLine.startsWith('event:')) {
            const eventType = trimmedLine.slice(6).trim();
            console.log('Event type:', eventType);
            continue;
          }

          if (trimmedLine.startsWith('data:')) {
            const dataStr = trimmedLine.slice(5).trim();
            
            if (dataStr === '[DONE]') {
              onComplete();
              return;
            }

            try {
              const data = JSON.parse(dataStr);
              console.log('Parsed SSE data:', data);

              // Handle conversation_id_set event
              if (data.data?.conversation_id) {
                this.conversationId = data.data.conversation_id;
                console.log('Set conversation ID:', this.conversationId);
              }

              // Handle reasoning events
              if (data.data?.reasoning && onReasoning) {
                console.log('Received reasoning:', data.data.reasoning);
                onReasoning(data.data.reasoning);
              }

              // Handle message_chunk events
              if (data.data?.text_chunk) {
                console.log('Received text chunk:', data.data.text_chunk);
                onChunk(data.data.text_chunk);
              }

              // Handle message_complete event
              if (data.data?.message_content) {
                console.log('Message complete:', data.data.message_content);
              }

              // Handle round_complete event
              if (data.data?.round) {
                console.log('Round complete');
              }

              // Handle conversation_created event
              if (data.data?.title) {
                console.log('Conversation created with title:', data.data.title);
              }

            } catch (parseError) {
              console.warn('Failed to parse SSE data:', dataStr, parseError);
            }
          }
        }
      }
    } catch (error) {
      console.error('Streaming error:', error);
      onError(error as Error);
    }
  }

  private async handleJsonResponse(
    response: Response,
    onChunk: (chunk: string) => void,
    onComplete: () => void,
    onError: (error: Error) => void
  ): Promise<void> {
    try {
      const data: ConverseResponse = await response.json();
      
      if (data.conversation_id) {
        this.conversationId = data.conversation_id;
      }
      
      const response_text = data.response || '';
      
      if (response_text) {
        const words = response_text.split(' ');
        
        for (let i = 0; i < words.length; i++) {
          const chunk = (i === 0 ? '' : ' ') + words[i];
          onChunk(chunk);
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
      
      onComplete();
    } catch (error) {
      console.error('JSON parsing error:', error);
      onError(error as Error);
    }
  }

  public resetConversation(): void {
    this.conversationId = null;
  }

  public getConversationId(): string | null {
    return this.conversationId;
  }
}

export { ElasticAgentService, type ChatMessage, type ElasticAgentConfig };