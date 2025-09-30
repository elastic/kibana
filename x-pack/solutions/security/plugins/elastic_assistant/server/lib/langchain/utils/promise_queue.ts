/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export class PromiseQueue {
  pendingPromises: Set<Promise<unknown>>;

  constructor() {
    this.pendingPromises = new Set<Promise<unknown>>();
  }

  queuePromise(maybePromise?: Promise<unknown>) {
    if (maybePromise) {
      // Track and auto-remove when settled
      const tracked = maybePromise.finally(() => this.pendingPromises.delete(tracked));
      this.pendingPromises.add(tracked);
    }
  }
}
