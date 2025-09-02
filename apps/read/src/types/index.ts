// Core application types

export interface User {
  id: string;
  email: string;
  displayName?: string;
  subscriptionTier: 'free' | 'premium';
  createdAt: string;
}

export interface Story {
  id: string;
  title: string;
  ageRange: [number, number];
  themes: string[];
  scenes: Scene[];
  isPremium?: boolean;
  createdBy?: string;
  createdAt?: string;
}

export interface Scene {
  id: string;
  text: string;
  background?: string;
  choices?: Choice[];
  conditions?: Condition[];
}

export interface Choice {
  label: string;
  nextSceneId: string;
  conditions?: Condition[];
}

export interface Condition {
  type: 'variable' | 'choice';
  key: string;
  value: unknown;
}

export interface Room {
  id: string;
  createdBy: string;
  storyId: string;
  status: 'waiting' | 'connected' | 'disconnected';
  participants: Participant[];
  createdAt: string;
  expiresAt: string;
}

export interface Participant {
  id: string;
  name?: string;
  role: 'adult' | 'child';
  joinedAt: string;
}

export interface Session {
  id: string;
  roomId: string;
  userId: string;
  storyProgress: StoryProgress;
  startedAt: string;
  endedAt?: string;
}

export interface StoryProgress {
  currentSceneId: string;
  completedScenes: string[];
  variables: Record<string, unknown>;
  choiceHistory: ChoiceHistory[];
}

export interface ChoiceHistory {
  sceneId: string;
  choiceId: string;
  timestamp: string;
}

// WebRTC types
export interface WebRTCState {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isConnected: boolean;
  isMuted: boolean;
  isVideoOff: boolean;
  peerConnection: RTCPeerConnection | null;
}

// UI State types
export interface UIState {
  mode: 'storybook' | 'video-first' | 'default';
  isMenuOpen: boolean;
  isLoading: boolean;
  error: string | null;
}
