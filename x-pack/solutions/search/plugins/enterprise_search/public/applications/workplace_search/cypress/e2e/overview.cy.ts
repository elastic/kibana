/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login, checkA11y } from '../support/commands';

context('Overview', () => {
  beforeEach(() => {
    login();
  });

  it('renders', () => {
    cy.contains('Workplace Search');
    checkA11y();
  });
});
