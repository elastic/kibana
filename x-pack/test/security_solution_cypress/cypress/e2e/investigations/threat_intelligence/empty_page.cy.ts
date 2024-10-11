/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { visitWithTimeRange } from '../../../tasks/navigation';
import { login } from '../../../tasks/login';
import {
  EMPTY_PAGE_BODY,
  EMPTY_PAGE_DOCS_LINK,
  EMPTY_PAGE_INTEGRATIONS_LINK,
} from '../../../screens/threat_intelligence/empty_page';

const URL = '/app/security/threat_intelligence/';

describe('Empty Page', { tags: ['@ess'] }, () => {
  beforeEach(() => {
    login();
    visitWithTimeRange(URL);
  });

  it('should render the empty page with link to docs and integrations, and navigate to integrations page', () => {
    cy.get(EMPTY_PAGE_BODY).should('be.visible');
    cy.get(EMPTY_PAGE_DOCS_LINK).should('be.visible');
    cy.get(EMPTY_PAGE_INTEGRATIONS_LINK).should('be.visible');

    cy.get(EMPTY_PAGE_INTEGRATIONS_LINK).click();
    cy.url().should('include', '/app/integrations/browse/threat_intel');
    cy.get('h1').first().should('contain', 'Integrations');
  });
});
