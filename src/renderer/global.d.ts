import type { WhispreeAPI } from '../shared/whispree-api';

declare module '*.css?raw' {
  const source: string;
  export default source;
}

declare global {
  interface Window {
    whispree: WhispreeAPI;
  }
}

export {};
