/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const CLEANUP_EVENTS = ['SIGINT', 'exit', 'uncaughtException', 'unhandledRejection'];
export class Manager {
  constructor() {
    const cleanup = () => this.cleanup();
    CLEANUP_EVENTS.forEach((ev) => process.on(ev, cleanup));
  }
  cleanup() {}
}
