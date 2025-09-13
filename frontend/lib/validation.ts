/**
 * Voice Assistant Validation System
 * Ensures RAG integration and voice functionality are working correctly
 */

export interface ValidationResult {
  isValid: boolean;
  message: string;
  details?: string;
  timestamp: Date;
}

export interface SystemHealth {
  backend: ValidationResult;
  voice: ValidationResult;
  avatar: ValidationResult;
  rag: ValidationResult;
  overall: ValidationResult;
}

class VoiceAssistantValidator {
  private backendUrl: string;

  constructor() {
    this.backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
  }

  /**
   * Validate backend connectivity
   */
  async validateBackend(): Promise<ValidationResult> {
    try {
      const response = await fetch(`${this.backendUrl}/health`, {
        method: 'GET',
        timeout: 5000,
      } as RequestInit);

      if (response.ok) {
        return {
          isValid: true,
          message: 'Backend is responsive',
          timestamp: new Date(),
        };
      } else {
        return {
          isValid: false,
          message: 'Backend returned error status',
          details: `Status: ${response.status}`,
          timestamp: new Date(),
        };
      }
    } catch (error) {
      return {
        isValid: false,
        message: 'Backend connection failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Validate RAG system
   */
  async validateRAG(): Promise<ValidationResult> {
    try {
      const testQuery = "What services do you offer?";
      
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: testQuery,
          thread_id: `validation_${Date.now()}`,
        }),
      });

      if (!response.ok) {
        return {
          isValid: false,
          message: 'RAG API request failed',
          details: `Status: ${response.status}`,
          timestamp: new Date(),
        };
      }

      const data = await response.json();
      
      if (data.reply && data.reply.length > 10) {
        return {
          isValid: true,
          message: 'RAG system is working',
          details: `Response length: ${data.reply.length} characters`,
          timestamp: new Date(),
        };
      } else {
        return {
          isValid: false,
          message: 'RAG returned invalid response',
          details: `Response: ${data.reply || 'Empty'}`,
          timestamp: new Date(),
        };
      }
    } catch (error) {
      return {
        isValid: false,
        message: 'RAG validation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Validate voice capabilities
   */
  async validateVoice(): Promise<ValidationResult> {
    try {
      // Check if browser supports required APIs
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return {
          isValid: false,
          message: 'Browser does not support voice input',
          details: 'MediaDevices API not available',
          timestamp: new Date(),
        };
      }

      // Check microphone permissions
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop()); // Clean up
        
        return {
          isValid: true,
          message: 'Voice input is available',
          details: 'Microphone access granted',
          timestamp: new Date(),
        };
      } catch (permissionError) {
        return {
          isValid: false,
          message: 'Microphone access denied',
          details: 'Please allow microphone permissions',
          timestamp: new Date(),
        };
      }
    } catch (error) {
      return {
        isValid: false,
        message: 'Voice validation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Validate avatar system
   */
  async validateAvatar(): Promise<ValidationResult> {
    try {
      const heygenApiKey = process.env.NEXT_PUBLIC_HEYGEN_API_KEY;
      const avatarId = process.env.NEXT_PUBLIC_AVATAR_ID;

      if (!heygenApiKey || heygenApiKey === 'your_heygen_api_key_here') {
        return {
          isValid: false,
          message: 'HeyGen API key not configured',
          details: 'Add NEXT_PUBLIC_HEYGEN_API_KEY to .env.local',
          timestamp: new Date(),
        };
      }

      if (!avatarId || avatarId === 'your_avatar_id_here') {
        return {
          isValid: false,
          message: 'Avatar ID not configured',
          details: 'Add NEXT_PUBLIC_AVATAR_ID to .env.local',
          timestamp: new Date(),
        };
      }

      // Test token creation
      try {
        const response = await fetch('https://api.heygen.com/v1/streaming.create_token', {
          method: 'POST',
          headers: {
            'x-api-key': heygenApiKey,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          return {
            isValid: true,
            message: 'Avatar system is configured',
            details: 'HeyGen API accessible',
            timestamp: new Date(),
          };
        } else {
          return {
            isValid: false,
            message: 'HeyGen API authentication failed',
            details: `Status: ${response.status}`,
            timestamp: new Date(),
          };
        }
      } catch (apiError) {
        return {
          isValid: false,
          message: 'HeyGen API connection failed',
          details: apiError instanceof Error ? apiError.message : 'Unknown error',
          timestamp: new Date(),
        };
      }
    } catch (error) {
      return {
        isValid: false,
        message: 'Avatar validation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Run comprehensive system validation
   */
  async validateSystem(): Promise<SystemHealth> {
    console.log('🔍 Starting system validation...');

    const [backend, rag, voice, avatar] = await Promise.all([
      this.validateBackend(),
      this.validateRAG(),
      this.validateVoice(),
      this.validateAvatar(),
    ]);

    const allValid = backend.isValid && rag.isValid && voice.isValid && avatar.isValid;
    const criticalValid = backend.isValid && rag.isValid; // Voice and avatar are optional for basic functionality

    const overall: ValidationResult = {
      isValid: criticalValid,
      message: allValid 
        ? 'All systems operational' 
        : criticalValid 
        ? 'Core systems operational (some features may be limited)'
        : 'Critical systems offline',
      details: allValid 
        ? 'Full voice assistant functionality available'
        : criticalValid
        ? 'Text-based functionality available, voice features may be limited'
        : 'System requires attention before use',
      timestamp: new Date(),
    };

    const health: SystemHealth = {
      backend,
      rag,
      voice,
      avatar,
      overall,
    };

    console.log('🔍 System validation complete:', health);
    return health;
  }

  /**
   * Get validation summary for display
   */
  getValidationSummary(health: SystemHealth): string {
    const issues = [];
    
    if (!health.backend.isValid) issues.push('Backend connection');
    if (!health.rag.isValid) issues.push('RAG system');
    if (!health.voice.isValid) issues.push('Voice input');
    if (!health.avatar.isValid) issues.push('Avatar system');

    if (issues.length === 0) {
      return 'All systems operational ✅';
    } else if (health.overall.isValid) {
      return `Core systems operational ⚠️ (${issues.join(', ')} need attention)`;
    } else {
      return `System issues detected ❌ (${issues.join(', ')} offline)`;
    }
  }

  /**
   * Get recommendations based on validation results
   */
  getRecommendations(health: SystemHealth): string[] {
    const recommendations = [];

    if (!health.backend.isValid) {
      recommendations.push('Check backend server status and network connectivity');
    }

    if (!health.rag.isValid) {
      recommendations.push('Verify RAG system configuration and data ingestion');
    }

    if (!health.voice.isValid) {
      recommendations.push('Enable microphone permissions in browser settings');
    }

    if (!health.avatar.isValid) {
      recommendations.push('Configure HeyGen API credentials in .env.local');
    }

    if (recommendations.length === 0) {
      recommendations.push('System is fully operational and ready for use');
    }

    return recommendations;
  }
}

// Export singleton instance
export const validator = new VoiceAssistantValidator();

// Utility function for quick validation
export async function quickValidation(): Promise<boolean> {
  const health = await validator.validateSystem();
  return health.overall.isValid;
}

// Utility function to get status for UI display
export async function getSystemStatus(): Promise<{
  status: 'operational' | 'degraded' | 'offline';
  message: string;
  details: SystemHealth;
}> {
  const health = await validator.validateSystem();
  
  let status: 'operational' | 'degraded' | 'offline';
  if (health.overall.isValid && health.voice.isValid && health.avatar.isValid) {
    status = 'operational';
  } else if (health.overall.isValid) {
    status = 'degraded';
  } else {
    status = 'offline';
  }

  return {
    status,
    message: validator.getValidationSummary(health),
    details: health,
  };
}
