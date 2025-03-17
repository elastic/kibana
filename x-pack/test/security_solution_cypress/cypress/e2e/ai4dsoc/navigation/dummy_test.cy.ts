/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login } from '../../../tasks/login';
import { visit } from '../../../tasks/navigation';
import { ATTACK_DISCOVERY_URL, GET_STARTED_URL } from '../../../urls/navigation';
import { navigateFromKibanaCollapsibleTo } from '../../../tasks/kibana_navigation';
import { ATTACK_DISCOVERY } from '../../../screens/kibana_navigation';

describe('Dummy Test ', { tags: '@serverless' }, () => {
  beforeEach(() => {
    login();
    visit(GET_STARTED_URL);
  });

  it('navigates to the Attack Discovery page', () => {
    navigateFromKibanaCollapsibleTo(ATTACK_DISCOVERY);
    cy.url().should('include', ATTACK_DISCOVERY_URL);
  });
});
