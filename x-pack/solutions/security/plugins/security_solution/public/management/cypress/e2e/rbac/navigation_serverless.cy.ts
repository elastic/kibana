/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as ServerlessHeaders from '@kbn/test-suites-xpack-security/security_solution_cypress/cypress/screens/serverless_security_header';
import { login, ROLE } from '../../tasks/login';
import { loadPage } from '../../tasks/common';
import { getNavigationPages } from './navigation_rbac_test_suite';

describe(
  'Navigation RBAC - Serverless - using prebuilt roles (for now)',
  { tags: ['@serverless'] },
  () => {
    const Selectors = ServerlessHeaders;
    const MenuButtonSelector = ServerlessHeaders.ASSETS_PANEL_BTN;
    const allPages = getNavigationPages(Selectors);

    it('without access to any of the subpages, none of those should be displayed', () => {
      login(ROLE.detections_admin);
      loadPage('/app/security');
      cy.get(ServerlessHeaders.MORE_MENU_BTN).should('not.exist');
      cy.get(MenuButtonSelector).should('not.exist');

      for (const page of allPages) {
        cy.get(page.selector).should('not.exist');
      }
    });

    it('with access to all of the subpages, all of those should be displayed', () => {
      login(ROLE.soc_manager);
      loadPage('/app/security');
      ServerlessHeaders.showMoreItems();
      cy.get(MenuButtonSelector).click();
      cy.get(allPages[0].selector).click();

      for (const page of allPages) {
        if (page.selector !== Selectors.TRUSTED_DEVICES) {
          cy.get(page.selector);
        }
      }
    });
  }
);
