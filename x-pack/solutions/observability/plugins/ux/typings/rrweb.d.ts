/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

declare module 'rrweb' {
  export class Replayer {
    constructor(
      events: unknown[],
      config?: {
        root?: HTMLElement;
        skipInactive?: boolean;
        speed?: number;
        mouseTail?: boolean;
        liveMode?: boolean;
        useVirtualDom?: boolean;
      }
    );
    play(timeOffset?: number): void;
    pause(timeOffset?: number): void;
    startLive(baselineTime?: number): void;
    addEvent(event: unknown): void;
    getCurrentTime(): number;
    getMetaData(): { startTime: number; endTime: number; totalTime: number };
    on(event: string, handler: (...args: unknown[]) => void): this;
    setConfig(config: { speed?: number; skipInactive?: boolean }): void;
    destroy?(): void;
  }
}

declare module 'rrweb/dist/style.css';
