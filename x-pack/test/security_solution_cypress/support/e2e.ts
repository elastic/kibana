/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// / <reference types="cypress" />

// ***********************************************************
// This example support/index.js is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

import { subj as testSubjSelector } from '@kbn/test-subj-selector';

// force ESM in this module
export {};

import 'cypress-react-selector';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /**
       * Get Elements by `data-test-subj`
       * @param args
       */
      getByTestSubj<E extends Node = HTMLElement>(
        ...args: Parameters<Cypress.Chainable<E>['get']>
      ): Chainable<JQuery<E>>;
    }
  }
}

Cypress.Commands.addQuery<'getByTestSubj'>(
  'getByTestSubj',
  function getByTestSubj(selector, options) {
    const getFn = cy.now('get', testSubjSelector(selector), options) as (
      subject: Cypress.Chainable<JQuery<HTMLElement>>
    ) => Cypress.Chainable<JQuery<HTMLElement>>;

    return (subject) => getFn(subject);
  }
);
