/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

if (!window.Worker) {
  // @ts-ignore we aren't honoring the real Worker spec here
  window.Worker = function Worker() {
    this.postMessage = jest.fn();

    // @ts-ignore TypeScript doesn't think this exists on the Worker interface
    // https://developer.mozilla.org/en-US/docs/Web/API/Worker/terminate
    this.terminate = jest.fn();
  };
}
