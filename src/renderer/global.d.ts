import type { WhispreeAPI } from '../shared/whispree-api';

declare global {
  interface Window {
    whispree: WhispreeAPI;
  }
}

export {};
