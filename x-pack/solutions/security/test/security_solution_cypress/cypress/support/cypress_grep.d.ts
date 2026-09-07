/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

declare module '@cypress/grep' {
  export function register(): void;
}

declare module '@cypress/grep/plugin' {
  interface CypressConfigOptions {
    env?: Record<string, unknown>;
    specPattern?: string | string[];
    excludeSpecPattern?: string | string[];
  }
  export function plugin(config: CypressConfigOptions): CypressConfigOptions;
}

declare namespace Cypress {
  interface SuiteConfigOverrides {
    tags?: string | string[];
  }
  interface TestConfigOverrides {
    tags?: string | string[];
  }
  interface Cypress {
    grep: (grep?: string, tags?: string, burn?: string) => void;
  }
}
