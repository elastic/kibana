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
      config?: { root?: HTMLElement; skipInactive?: boolean; speed?: number }
    );
    play(timeOffset?: number): void;
    pause(): void;
    setConfig(config: { speed?: number }): void;
    destroy?(): void;
  }
}

declare module 'rrweb/dist/style.css';
