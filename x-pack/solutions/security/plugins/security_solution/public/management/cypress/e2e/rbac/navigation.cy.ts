/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as ServerlessHeaders from '@kbn/test-suites-xpack-security/security_solution_cypress/cypress/screens/serverless_security_header';
import * as EssHeaders from '@kbn/test-suites-xpack-security/security_solution_cypress/cypress/screens/security_header';
import { login, ROLE } from '../../tasks/login';
import { loadPage } from '../../tasks/common';
import type { SiemVersion } from '../../common/constants';
import { SIEM_VERSIONS } from '../../common/constants';

describe('Navigation RBAC', () => {
  const isServerless = Cypress.env('IS_SERVERLESS');

  const Selectors = isServerless ? ServerlessHeaders : EssHeaders;
  const MenuButtonSelector = isServerless
    ? ServerlessHeaders.ASSETS_PANEL_BTN
    : EssHeaders.SETTINGS_PANEL_BTN;

  const allPages = [
    {
      name: 'Endpoints',
      privilegePrefix: 'endpoint_list_',
      selector: Selectors.ENDPOINTS,
    },
    {
      name: 'Policies',
      privilegePrefix: 'policy_management_',
      selector: Selectors.POLICIES,
    },
    {
      name: 'Trusted applications',
      privilegePrefix: 'trusted_applications_',
      selector: Selectors.TRUSTED_APPS,
    },
    {
      name: 'Trusted devices',
      privilegePrefix: 'trusted_devices_',
      selector: Selectors.TRUSTED_DEVICES,
      siemVersions: ['siemV3', 'siemV4', 'siemV5'], // Only available starting siemV3
    },
    {
      name: 'Event filters',
      privilegePrefix: 'event_filters_',
      selector: Selectors.EVENT_FILTERS,
    },
    {
      name: 'Blocklist',
      privilegePrefix: 'blocklist_',
      selector: Selectors.BLOCKLIST,
    },
    {
      name: 'Host isolation exceptions',
      privilegePrefix: 'host_isolation_exceptions_',
      selector: Selectors.HOST_ISOLATION_EXCEPTIONS,
    },
    {
      name: 'Response actions history',
      privilegePrefix: 'actions_log_management_',
      selector: Selectors.RESPONSE_ACTIONS_HISTORY,
    },
  ];

  const getPagesForSiemVersion = (siemVersion: SiemVersion) => {
    return allPages.filter((page) => !page.siemVersions || page.siemVersions.includes(siemVersion));
  };

  describe('ESS - using custom roles', { tags: ['@ess'] }, () => {
    for (const siemVersion of SIEM_VERSIONS) {
      describe(siemVersion, () => {
        const pages = getPagesForSiemVersion(siemVersion);

        describe('NONE access', () => {
          beforeEach(() => {
            login.withCustomKibanaPrivileges({ [siemVersion]: ['all'] });
          });

          it(`none of the links should be visible in navigation bar`, () => {
            loadPage('/app/security');
            cy.get(MenuButtonSelector).click();

            for (const page of pages) {
              cy.get(page.selector).should('not.exist');
            }
          });

          it(`none of the cards should be visible on Management page`, () => {
            loadPage('/app/security/manage');

            for (const page of pages) {
              cy.getByTestSubj('LandingItem').should('not.contain.text', page.name);
            }
          });
        });

        for (const access of ['read', 'all']) {
          for (const page of pages) {
            describe(`${access.toUpperCase()} access only to ${page.name}`, () => {
              beforeEach(() => {
                login.withCustomKibanaPrivileges({
                  [siemVersion]: ['read', `${page.privilegePrefix}${access}`],
                });
              });

              it(`only ${page.name} link should be displayed in navigation bar`, () => {
                loadPage('/app/security');
                cy.get(MenuButtonSelector).click();

                cy.get(page.selector);
                pages
                  .filter((iterator) => iterator.name !== page.name)
                  .forEach((otherPage) => cy.get(otherPage.selector).should('not.exist'));
              });

              it(`only ${page.name} card should be displayed on Management page`, () => {
                loadPage('/app/security/manage');

                cy.contains(page.name);
                pages
                  .filter((iterator) => iterator.name !== page.name)
                  .forEach((otherPage) =>
                    cy.getByTestSubj('LandingItem').should('not.contain.text', otherPage.name)
                  );
              });
            });
          }
        }
      });
    }
  });

  describe('Serverless - using prebuilt roles (for now)', { tags: ['@serverless'] }, () => {
    it('without access to any of the subpages, none of those should be displayed', () => {
      login(ROLE.detections_admin);
      loadPage('/app/security');
      // assets should be missing, checking that assets link and more button is missing
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
      cy.get(MenuButtonSelector).click(); // click "Assets" to open the menu
      cy.get(allPages[0].selector).click(); // open the Assets anv panel by clicking the first item in more>assets popover

      for (const page of allPages) {
        if (page.selector !== Selectors.TRUSTED_DEVICES) {
          // Skip Trusted Devices for now — soc_manager does not yet have the required privilege in controller (MKI would fail otherwise).
          cy.get(page.selector);
        }
      }
    });
  });
});
