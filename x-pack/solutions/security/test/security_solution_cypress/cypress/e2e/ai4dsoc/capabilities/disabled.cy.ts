/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login } from '../../../tasks/login';
import { visit } from '../../../tasks/navigation';
import { APP_NOT_FOUND_PAGE } from '../../../screens/ai_soc';
import { APP_DASHBOARDS_URL, VISUALIZE_URL, MAPS_URL, LENS_URL } from '../../../urls/navigation';

describe.skip('Disabled features', { tags: '@serverless' }, () => {
  beforeEach(() => {
    login('admin');
  });

  it('dashboards app should not be available', () => {
    visit(APP_DASHBOARDS_URL);
    cy.get(APP_NOT_FOUND_PAGE).should('exist');
  });
  it('visualize app should not be available', () => {
    visit(VISUALIZE_URL);
    cy.get(APP_NOT_FOUND_PAGE).should('exist');
  });
  it('maps app should not be available', () => {
    visit(MAPS_URL);
    cy.get(APP_NOT_FOUND_PAGE).should('exist');
  });
  it('lens app should not be available', () => {
    visit(LENS_URL);
    cy.get(APP_NOT_FOUND_PAGE).should('exist');
  });
});
