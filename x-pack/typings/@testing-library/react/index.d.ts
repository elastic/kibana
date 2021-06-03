/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// Write custom types because @types/testing-library__react doesn't work with our version of TypeScript
declare module '@testing-library/react' {
  // Lifted from https://github.com/testing-library/dom-testing-library/blob/4b2976d5161aa6ae3f35e5f9a9952e63c1997768/types/wait.d.ts
  export function wait(
    callback?: () => void,
    options?: {
      timeout?: number;
      interval?: number;
    }
  ): Promise<void>;
}
