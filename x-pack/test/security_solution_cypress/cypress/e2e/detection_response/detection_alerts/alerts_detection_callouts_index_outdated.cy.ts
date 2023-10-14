/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ROLES } from '@kbn/security-solution-plugin/common/test';

import { ALERTS_URL } from '../../../urls/navigation';
import { RULES_MANAGEMENT_URL } from '../../../urls/rules_management';
import { ruleDetailsUrl } from '../../../urls/rule_details';
import { getNewRule } from '../../../objects/rule';
import { PAGE_TITLE } from '../../../screens/common/page';

import { login } from '../../../tasks/login';
import { visit } from '../../../tasks/navigation';

import { createRule, deleteCustomRule } from '../../../tasks/api_calls/rules';
import {
  getCallOut,
  NEED_ADMIN_FOR_UPDATE_CALLOUT,
  waitForCallOutToBeShown,
} from '../../../tasks/common/callouts';

const loadPageAsPlatformEngineerUser = (url: string) => {
  login(ROLES.soc_manager);
  visit(url, { role: ROLES.soc_manager });
  waitForPageTitleToBeShown();
};

const waitForPageTitleToBeShown = () => {
  cy.get(PAGE_TITLE).should('be.visible');
};

describe(
  'Detections > Need Admin Callouts indicating an admin is needed to migrate the alert data set',
  { tags: ['@ess', '@skipInServerless'] },
  () => {
    before(() => {
      // First, we have to open the app on behalf of a privileged user in order to initialize it.
      // Otherwise the app will be disabled and show a "welcome"-like page.
      login();
      visit(ALERTS_URL);
      waitForPageTitleToBeShown();
    });

    context(
      'The users index_mapping_outdated is "true" and their admin callouts should show up',
      () => {
        beforeEach(() => {
          // Index mapping outdated is forced to return true as being outdated so that we get the
          // need admin callouts being shown.
          cy.intercept('GET', '/api/detection_engine/index', (req) => {
            req.reply((res) => {
              res.send(200, {
                index_mapping_outdated: true,
                name: '.alerts-security.alerts-default',
              });
            });
          });
        });

        context('On Detections home page', () => {
          beforeEach(() => {
            loadPageAsPlatformEngineerUser(ALERTS_URL);
          });

          it('We show the need admin primary callout', () => {
            waitForCallOutToBeShown(NEED_ADMIN_FOR_UPDATE_CALLOUT, 'primary');
          });
        });

        context('On Rules Management page', () => {
          beforeEach(() => {
            loadPageAsPlatformEngineerUser(RULES_MANAGEMENT_URL);
          });

          it('We show 1 primary callout of need admin', () => {
            waitForCallOutToBeShown(NEED_ADMIN_FOR_UPDATE_CALLOUT, 'primary');
          });
        });

        context('On Rule Details page', () => {
          beforeEach(() => {
            createRule(getNewRule({ rule_id: 'rule_testing' })).then((rule) =>
              loadPageAsPlatformEngineerUser(ruleDetailsUrl(rule.body.id))
            );
          });

          afterEach(() => {
            deleteCustomRule();
          });

          it('We show 1 primary callout', () => {
            waitForCallOutToBeShown(NEED_ADMIN_FOR_UPDATE_CALLOUT, 'primary');
          });
        });
      }
    );

    context(
      'The users index_mapping_outdated is "false" and their admin callouts should not show up ',
      () => {
        beforeEach(() => {
          // Index mapping outdated is forced to return true as being outdated so that we get the
          // need admin callouts being shown.
          cy.intercept('GET', '/api/detection_engine/index', {
            index_mapping_outdated: false,
            name: '.alerts-security.alerts-default',
          });
        });
        context('On Detections home page', () => {
          beforeEach(() => {
            loadPageAsPlatformEngineerUser(ALERTS_URL);
          });

          it('We show the need admin primary callout', () => {
            getCallOut(NEED_ADMIN_FOR_UPDATE_CALLOUT).should('not.exist');
          });
        });

        context('On Rules Management page', () => {
          beforeEach(() => {
            loadPageAsPlatformEngineerUser(RULES_MANAGEMENT_URL);
          });

          it('We show 1 primary callout of need admin', () => {
            getCallOut(NEED_ADMIN_FOR_UPDATE_CALLOUT).should('not.exist');
          });
        });

        context('On Rule Details page', () => {
          beforeEach(() => {
            createRule(getNewRule({ rule_id: 'rule_testing' })).then((rule) =>
              loadPageAsPlatformEngineerUser(ruleDetailsUrl(rule.body.id))
            );
          });

          afterEach(() => {
            deleteCustomRule();
          });

          it('We show 1 primary callout', () => {
            getCallOut(NEED_ADMIN_FOR_UPDATE_CALLOUT).should('not.exist');
          });
        });
      }
    );

    context(
      'The users index_mapping_outdated is "null" and their admin callouts should not show up ',
      () => {
        beforeEach(() => {
          // Index mapping outdated is forced to return true as being outdated so that we get the
          // need admin callouts being shown.
          cy.intercept('GET', '/api/detection_engine/index', {
            index_mapping_outdated: null,
            name: '.alerts-security.alerts-default',
          });
        });
        context('On Detections home page', () => {
          beforeEach(() => {
            loadPageAsPlatformEngineerUser(ALERTS_URL);
          });

          it('We show the need admin primary callout', () => {
            getCallOut(NEED_ADMIN_FOR_UPDATE_CALLOUT).should('not.exist');
          });
        });

        context('On Rules Management page', () => {
          beforeEach(() => {
            loadPageAsPlatformEngineerUser(RULES_MANAGEMENT_URL);
          });

          it('We show 1 primary callout of need admin', () => {
            getCallOut(NEED_ADMIN_FOR_UPDATE_CALLOUT).should('not.exist');
          });
        });

        context('On Rule Details page', () => {
          beforeEach(() => {
            createRule(getNewRule({ rule_id: 'rule_testing' })).then((rule) =>
              loadPageAsPlatformEngineerUser(ruleDetailsUrl(rule.body.id))
            );
          });

          afterEach(() => {
            deleteCustomRule();
          });

          it('We show 1 primary callout', () => {
            getCallOut(NEED_ADMIN_FOR_UPDATE_CALLOUT).should('not.exist');
          });
        });
      }
    );
  }
);
