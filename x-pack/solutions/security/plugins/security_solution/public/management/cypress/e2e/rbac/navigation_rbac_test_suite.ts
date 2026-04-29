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
  ARTIFACTS: string;
  RESPONSE_ACTIONS_HISTORY: string;
}

/**
 * Artifact types share one nav link and one Manage landing card ("Artifacts").
 * Each privilege prefix is tested separately; visibility expectations are the same
 * (only the Artifacts link/card vs other management areas).
 */
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
    name: 'Artifacts',
    privilegePrefix: 'trusted_applications_',
    selector: selectors.ARTIFACTS,
  },
  {
    name: 'Artifacts',
    privilegePrefix: 'trusted_devices_',
    selector: selectors.ARTIFACTS,
    siemVersions: ['siemV3', 'siemV4', 'siemV5'],
  },
  {
    name: 'Artifacts',
    privilegePrefix: 'event_filters_',
    selector: selectors.ARTIFACTS,
  },
  {
    name: 'Artifacts',
    privilegePrefix: 'blocklist_',
    selector: selectors.ARTIFACTS,
  },
  {
    name: 'Artifacts',
    privilegePrefix: 'host_isolation_exceptions_',
    selector: selectors.ARTIFACTS,
  },
  {
    name: 'Artifacts',
    privilegePrefix: 'endpoint_exceptions_',
    selector: selectors.ARTIFACTS,
  },
  {
    name: 'Response actions history',
    privilegePrefix: 'actions_log_management_',
    selector: selectors.RESPONSE_ACTIONS_HISTORY,
  },
];

const describeTitleForPage = (access: string, page: PageEntry): string => {
  if (page.name === 'Artifacts') {
    return `${access.toUpperCase()} access only to Artifacts (via ${page.privilegePrefix})`;
  }
  return `${access.toUpperCase()} access only to ${page.name}`;
};

export const createNavigationEssSuite = (siemVersion: SiemVersion) => {
  const allPages = getNavigationPages(EssHeaders);
  const pages = allPages.filter(
    (page) => !page.siemVersions || page.siemVersions.includes(siemVersion)
  );
  const MenuButtonSelector = EssHeaders.SETTINGS_PANEL_BTN;
  const uniqueNavSelectors = [...new Set(pages.map((p) => p.selector))];
  const uniqueLandingNames = [...new Set(pages.map((p) => p.name))];

  describe(siemVersion, () => {
    describe('NONE access', () => {
      beforeEach(() => {
        login.withCustomKibanaPrivileges({ [siemVersion]: ['all'] });
      });

      it(`none of the links should be visible in navigation bar`, () => {
        loadPage('/app/security');
        cy.get(MenuButtonSelector).click();

        for (const selector of uniqueNavSelectors) {
          cy.get(selector).should('not.exist');
        }
      });

      it(`none of the cards should be visible on Management page`, () => {
        loadPage('/app/security/manage');

        for (const name of uniqueLandingNames) {
          cy.getByTestSubj('LandingItem').should('not.contain.text', name);
        }
      });
    });

    for (const access of ['read', 'all']) {
      for (const page of pages) {
        describe(describeTitleForPage(access, page), () => {
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
              .filter((iterator) => iterator.selector !== page.selector)
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
