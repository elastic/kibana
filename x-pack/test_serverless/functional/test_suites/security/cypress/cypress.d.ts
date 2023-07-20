/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// / <reference types="cypress" />

import { LoadedRoleAndUser, ServerlessRoleName } from '../../../../shared/lib';

export interface LoadUserAndRoleCyTaskOptions {
  name: ServerlessRoleName;
}

declare global {
  namespace Cypress {
    interface Chainable<Subject = any> {
      task(
        name: 'loadUserAndRole',
        arg: LoadUserAndRoleCyTaskOptions,
        options?: Partial<Loggable & Timeoutable>
      ): Chainable<LoadedRoleAndUser>;
    }
  }
}
