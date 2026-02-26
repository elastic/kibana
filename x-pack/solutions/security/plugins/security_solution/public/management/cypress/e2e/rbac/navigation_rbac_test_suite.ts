/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as EssHeaders from '@kbn/test-suites-xpack-security/security_solution_cypress/cypress/screens/security_header';
import { login } from '../../tasks/login';
import { loadPage } from '../../tasks/common';
import type { SiemVersion } from '../../common/constants';

interface PageEntry {
  name: string;
  privilegePrefix: string;
  selector: string;
  siemVersions?: string[];
}

interface NavigationSelectors {
  ENDPOINTS: string;
  POLICIES: string;
  TRUSTED_APPS: string;
  TRUSTED_DEVICES: string;
  EVENT_FILTERS: string;
  BLOCKLIST: string;
  HOST_ISOLATION_EXCEPTIONS: string;
  RESPONSE_ACTIONS_HISTORY: string;
}

export const getNavigationPages = (selectors: NavigationSelectors): PageEntry[] => [
  {
    name: 'Endpoints',
    privilegePrefix: 'endpoint_list_',
    selector: selectors.ENDPOINTS,
  },
  {
    name: 'Policies',
    privilegePrefix: 'policy_management_',
    selector: selectors.POLICIES,
  },
  {
    name: 'Trusted applications',
    privilegePrefix: 'trusted_applications_',
    selector: selectors.TRUSTED_APPS,
  },
  {
    name: 'Trusted devices',
    privilegePrefix: 'trusted_devices_',
    selector: selectors.TRUSTED_DEVICES,
    siemVersions: ['siemV3', 'siemV4', 'siemV5'],
  },
  {
    name: 'Event filters',
    privilegePrefix: 'event_filters_',
    selector: selectors.EVENT_FILTERS,
  },
  {
    name: 'Blocklist',
    privilegePrefix: 'blocklist_',
    selector: selectors.BLOCKLIST,
  },
  {
    name: 'Host isolation exceptions',
    privilegePrefix: 'host_isolation_exceptions_',
    selector: selectors.HOST_ISOLATION_EXCEPTIONS,
  },
  {
    name: 'Response actions history',
    privilegePrefix: 'actions_log_management_',
    selector: selectors.RESPONSE_ACTIONS_HISTORY,
  },
];

export const createNavigationEssSuite = (siemVersion: SiemVersion) => {
  const allPages = getNavigationPages(EssHeaders);
  const pages = allPages.filter(
    (page) => !page.siemVersions || page.siemVersions.includes(siemVersion)
  );
  const MenuButtonSelector = EssHeaders.SETTINGS_PANEL_BTN;

  describe(siemVersion, () => {
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
};
