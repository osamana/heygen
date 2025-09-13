import StreamingAvatar, { 
  AvatarQuality, 
  StreamingEvents, 
  TaskType,
  TaskMode 
} from '@heygen/streaming-avatar';

export interface AvatarConfig {
  apiKey: string;
  avatarId: string;
  knowledgeId?: string;
  quality?: AvatarQuality;
}

export interface AvatarMessage {
  id: string;
  type: 'user' | 'avatar' | 'system';
  content: string;
  timestamp: Date;
  sources?: string[];
}

export class AvatarService {
  private avatar: StreamingAvatar | null = null;
  private isConnected = false;
  private messageHandlers: ((message: AvatarMessage) => void)[] = [];
  private statusHandlers: ((status: string) => void)[] = [];
  private videoElement: HTMLVideoElement | null = null;
  private mediaStream: MediaStream | null = null;
  private sessionData: any = null;

  constructor(private config: AvatarConfig) {}

  async initialize(): Promise<void> {
    if (this.avatar) {
      return;
    }

    try {
      this.avatar = new StreamingAvatar({
        token: this.config.apiKey,
      });

      // Set up event listeners
      this.avatar.on(StreamingEvents.STREAM_READY, (event) => {
        console.log('🎥 STREAM_READY event received:', event);
        
        // Store session data
        this.sessionData = event;
        this.isConnected = true;
        this.notifyStatus('connected');
        
        // The HeyGen SDK automatically creates video elements in the DOM
        // We need to find and capture them
        setTimeout(() => {
          this.findAndSetupVideoElement();
        }, 100);
      });

      this.avatar.on(StreamingEvents.STREAM_DISCONNECTED, () => {
        console.log('Stream disconnected');
        this.isConnected = false;
        this.notifyStatus('disconnected');
      });

      this.avatar.on(StreamingEvents.AVATAR_START_TALKING, () => {
        console.log('Avatar started talking');
        this.notifyStatus('speaking');
      });

      this.avatar.on(StreamingEvents.AVATAR_STOP_TALKING, () => {
        console.log('Avatar stopped talking');
        this.notifyStatus('listening');
      });

      // Create and start avatar session with knowledge base
      const sessionConfig: any = {
        quality: this.config.quality || AvatarQuality.Low,
        avatarName: this.config.avatarId,
        language: 'en',
      };

      // Add knowledge base if available
      if (this.config.knowledgeId) {
        sessionConfig.knowledgeId = this.config.knowledgeId;
      }

      console.log('Creating avatar with config:', sessionConfig);
      console.log('Available avatars and config being used...');
      
      const result = await this.avatar.createStartAvatar(sessionConfig);
      console.log('Avatar creation result:', result);

    } catch (error) {
      console.error('Failed to initialize avatar:', error);
      throw error;
    }
  }

  async speak(text: string): Promise<void> {
    if (!this.avatar || !this.isConnected) {
      throw new Error('Avatar not connected');
    }

    try {
      await this.avatar.speak({
        text,
        task_type: TaskType.TALK,
        taskMode: TaskMode.SYNC
      });
    } catch (error) {
      console.error('Failed to make avatar speak:', error);
      throw error;
    }
  }

  async stopSpeaking(): Promise<void> {
    if (!this.avatar || !this.isConnected) {
      return;
    }

    try {
      await this.avatar.interrupt();
    } catch (error) {
      console.error('Failed to stop avatar speaking:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.avatar) {
      return;
    }

    try {
      await this.avatar.stopAvatar();
      this.avatar = null;
      this.isConnected = false;
      this.notifyStatus('disconnected');
    } catch (error) {
      console.error('Failed to disconnect avatar:', error);
      throw error;
    }
  }

  private findAndSetupVideoElement(): void {
    console.log('🔍 Searching for HeyGen video element...');
    
    // Look for video elements in the DOM
    const videos = Array.from(document.querySelectorAll('video'));
    console.log(`Found ${videos.length} video elements in DOM`);
    
    // Look for the HeyGen video element
    for (const video of videos) {
      console.log('Video element:', {
        src: video.src,
        srcObject: !!video.srcObject,
        autoplay: video.autoplay,
        muted: video.muted,
        className: video.className,
        id: video.id
      });
      
      // HeyGen videos typically have srcObject (MediaStream) and are set to autoplay
      if (video.srcObject || video.src.includes('blob:')) {
        console.log('✅ Found HeyGen video element!', video);
        this.videoElement = video;
        this.mediaStream = video.srcObject as MediaStream;
        
        // Ensure proper video settings
        video.autoplay = true;
        video.playsInline = true;
        video.muted = false; // We want audio
        video.controls = false;
        
        // Play the video if it's not already playing
        if (video.paused) {
          video.play().catch(console.error);
        }
        
        return;
      }
    }
    
    // If no video found, try again in a moment
    console.log('❌ No HeyGen video found, retrying in 500ms...');
    setTimeout(() => {
      if (!this.videoElement && this.isConnected) {
        this.findAndSetupVideoElement();
      }
    }, 500);
  }

  getVideoElement(): HTMLVideoElement | null {
    console.log('Getting video element, current:', this.videoElement);
    return this.videoElement;
  }

  // Get the media stream for manual video element creation
  getMediaStream(): MediaStream | null {
    console.log('Getting media stream, current:', this.mediaStream);
    return this.mediaStream;
  }

  // Try to get video element from DOM
  getVideoFromDOM(): HTMLVideoElement | null {
    const videos = document.querySelectorAll('video');
    console.log('Found videos in DOM:', videos.length);
    
    // Look for HeyGen video elements
    for (let i = 0; i < videos.length; i++) {
      const video = videos[i];
      if (video.srcObject || video.src.includes('heygen') || video.className.includes('avatar')) {
        console.log('Found potential HeyGen video:', video);
        return video;
      }
    }
    
    // Return the last video element if any
    return videos.length > 0 ? videos[videos.length - 1] : null;
  }

  onMessage(handler: (message: AvatarMessage) => void): () => void {
    this.messageHandlers.push(handler);
    return () => {
      const index = this.messageHandlers.indexOf(handler);
      if (index > -1) {
        this.messageHandlers.splice(index, 1);
      }
    };
  }

  onStatusChange(handler: (status: string) => void): () => void {
    this.statusHandlers.push(handler);
    return () => {
      const index = this.statusHandlers.indexOf(handler);
      if (index > -1) {
        this.statusHandlers.splice(index, 1);
      }
    };
  }

  private notifyMessage(message: AvatarMessage): void {
    this.messageHandlers.forEach(handler => handler(message));
  }

  private notifyStatus(status: string): void {
    this.statusHandlers.forEach(handler => handler(status));
  }

  isReady(): boolean {
    return this.isConnected;
  }
}

// Utility function to create access token
export async function createAccessToken(apiKey: string): Promise<string> {
  try {
    const response = await fetch('https://api.heygen.com/v1/streaming.create_token', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to create access token: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data?.token || data.token;
  } catch (error) {
    console.error('Error creating access token:', error);
    throw error;
  }
}
