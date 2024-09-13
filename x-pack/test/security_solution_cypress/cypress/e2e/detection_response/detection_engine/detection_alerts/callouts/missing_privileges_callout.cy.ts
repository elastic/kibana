/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ROLES } from '@kbn/security-solution-plugin/common/test';

import { ALERTS_URL } from '../../../../../urls/navigation';
import { RULES_MANAGEMENT_URL } from '../../../../../urls/rules_management';
import { getNewRule } from '../../../../../objects/rule';
import { PAGE_TITLE } from '../../../../../screens/common/page';

import { login } from '../../../../../tasks/login';
import { visit } from '../../../../../tasks/navigation';
import { createRule, deleteCustomRule } from '../../../../../tasks/api_calls/rules';
import {
  getCallOut,
  waitForCallOutToBeShown,
  dismissCallOut,
  MISSING_PRIVILEGES_CALLOUT,
} from '../../../../../tasks/common/callouts';
import { ruleDetailsUrl } from '../../../../../urls/rule_details';

const loadPageAsReadOnlyUser = (url: string) => {
  login(ROLES.t1_analyst);
  visit(url);
  waitForPageTitleToBeShown();
};

const loadPageAsPlatformEngineer = (url: string) => {
  login(ROLES.platform_engineer);
  visit(url);
  waitForPageTitleToBeShown();
};

const reloadPage = () => {
  cy.reload();
  waitForPageTitleToBeShown();
};

const waitForPageTitleToBeShown = () => {
  cy.get(PAGE_TITLE).should('be.visible');
};

describe('Detections > Callouts', { tags: ['@ess', '@serverless', '@skipInServerless'] }, () => {
  before(() => {
    // First, we have to open the app on behalf of a privileged user in order to initialize it.
    // Otherwise the app will be disabled and show a "welcome"-like page.
    login();
    visit(ALERTS_URL);
    waitForPageTitleToBeShown();
  });

  context('indicating read-only access to resources', () => {
    context('On Detections home page', () => {
      beforeEach(() => {
        loadPageAsReadOnlyUser(ALERTS_URL);
      });

      it('dismisses callout and persists its state', () => {
        waitForCallOutToBeShown(MISSING_PRIVILEGES_CALLOUT, 'primary');

        dismissCallOut(MISSING_PRIVILEGES_CALLOUT);
        reloadPage();

        getCallOut(MISSING_PRIVILEGES_CALLOUT).should('not.exist');
      });
    });

    // FYI: Rules Management check moved to ../detection_rules/all_rules_read_only.spec.ts

    context('On Rule Details page', () => {
      beforeEach(() => {
        createRule(getNewRule()).then((rule) =>
          loadPageAsReadOnlyUser(ruleDetailsUrl(rule.body.id))
        );
      });

      afterEach(() => {
        deleteCustomRule();
      });

      it('dismisses callout and persists its state', () => {
        waitForCallOutToBeShown(MISSING_PRIVILEGES_CALLOUT, 'primary');

        dismissCallOut(MISSING_PRIVILEGES_CALLOUT);
        reloadPage();

        getCallOut(MISSING_PRIVILEGES_CALLOUT).should('not.exist');
      });
    });
  });

  context('indicating read-write access to resources', () => {
    context('On Detections home page', () => {
      beforeEach(() => {
        loadPageAsPlatformEngineer(ALERTS_URL);
      });

      it('We show no callout', () => {
        getCallOut(MISSING_PRIVILEGES_CALLOUT).should('not.exist');
      });
    });

    context('On Rules Management page', () => {
      beforeEach(() => {
        login(ROLES.platform_engineer);
        loadPageAsPlatformEngineer(RULES_MANAGEMENT_URL);
      });

      it('We show no callout', () => {
        getCallOut(MISSING_PRIVILEGES_CALLOUT).should('not.exist');
      });
    });

    context('On Rule Details page', () => {
      beforeEach(() => {
        createRule(getNewRule()).then((rule) =>
          loadPageAsPlatformEngineer(ruleDetailsUrl(rule.body.id))
        );
      });

      afterEach(() => {
        deleteCustomRule();
      });

      it('We show no callouts', () => {
        getCallOut(MISSING_PRIVILEGES_CALLOUT).should('not.exist');
      });
    });
  });
});
