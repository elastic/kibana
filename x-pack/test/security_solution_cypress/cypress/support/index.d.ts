/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

declare namespace Cypress {
  interface Chainable<Subject> {
    promisify(): Promise<Subject>;
    attachFile(fileName: string, fileType?: string): Chainable<JQuery>;
    waitUntil(
      fn: (subject: Subject) => boolean | Chainable<boolean>,
      options?: {
        interval: number;
        timeout: number;
      }
    ): Chainable<Subject>;
  }
}

declare namespace Mocha {
  interface SuiteFunction {
    (title: string, ftrConfig: Record<string, string | number>, fn: (this: Suite) => void): Suite;
    (
      title: string,
      ftrConfig?: Record<string, string | number>,
      config: Cypress.TestConfigOverrides,
      fn: (this: Suite) => void
    ): Suite;
  }

  interface ExclusiveSuiteFunction {
    (title: string, ftrConfig: Record<string, string | number>, fn: (this: Suite) => void): Suite;
    (
      title: string,
      ftrConfig?: Record<string, string | number>,
      config: Cypress.TestConfigOverrides,
      fn: (this: Suite) => void
    ): Suite;
  }

  interface PendingSuiteFunction {
    (title: string, ftrConfig: Record<string, string | number>, fn: (this: Suite) => void): Suite;
    (
      title: string,
      ftrConfig?: Record<string, string | number>,
      config: Cypress.TestConfigOverrides,
      fn: (this: Suite) => void
    ): Suite | void;
  }
}
