/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest, tags } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';
import { getIndicatorMatchRule } from '../fixtures/indicator_match_rule';

const RULE_NAME = 'Indicator rule duplicate test';
const DUPLICATE_RULE_NAME = `${RULE_NAME} [Duplicate]`;

spaceTest.describe(
  'Indicator match rule duplication',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    spaceTest.beforeEach(async ({ browserAuth, apiServices }) => {
      await apiServices.detectionRule.createThreatMatchRule(
        getIndicatorMatchRule({ name: RULE_NAME, rule_id: 'rule_testing', enabled: false })
      );
      await browserAuth.loginAsPlatformEngineer();
    });

    spaceTest.afterEach(async ({ apiServices }) => {
      await apiServices.detectionRule.deleteAll();
    });

    spaceTest(
      'duplicates the rule from the rules table',
      async ({ kbnUrl, scoutSpace, pageObjects }) => {
        const { rulesManagementPage } = pageObjects;
        await rulesManagementPage.goto({ kbnUrl, spaceId: scoutSpace.id });
        await rulesManagementPage.disableAutoRefresh();
        await rulesManagementPage.duplicateRuleFromRowActions(RULE_NAME);
        // The app opens the duplicate once it has been created
        await expect(pageObjects.ruleDetailsPage.backToRuleDetailsLink).toBeVisible();

        await rulesManagementPage.goto({ kbnUrl, spaceId: scoutSpace.id });
        await expect(rulesManagementPage.ruleRow(DUPLICATE_RULE_NAME)).toBeVisible();
        await expect(rulesManagementPage.ruleSwitch(DUPLICATE_RULE_NAME)).toHaveAttribute(
          'aria-checked',
          'false'
        );
      }
    );

    spaceTest(
      "duplicates the rule from the rules table's bulk actions",
      async ({ kbnUrl, scoutSpace, pageObjects }) => {
        const { rulesManagementPage } = pageObjects;
        await rulesManagementPage.goto({ kbnUrl, spaceId: scoutSpace.id });
        await rulesManagementPage.disableAutoRefresh();
        await rulesManagementPage.duplicateAllRulesWithExceptions();

        await expect(rulesManagementPage.ruleRow(DUPLICATE_RULE_NAME)).toBeVisible();
        await expect(rulesManagementPage.ruleSwitch(DUPLICATE_RULE_NAME)).toHaveAttribute(
          'aria-checked',
          'false'
        );
      }
    );

    spaceTest(
      'duplicates the rule from the rule details page',
      async ({ kbnUrl, scoutSpace, pageObjects }) => {
        const { rulesManagementPage, ruleDetailsPage } = pageObjects;
        await rulesManagementPage.goto({ kbnUrl, spaceId: scoutSpace.id });
        await rulesManagementPage.openRuleDetails(RULE_NAME);
        await expect(ruleDetailsPage.header).toContainText(RULE_NAME);
        await ruleDetailsPage.duplicateFromActionsMenu();
        await expect(ruleDetailsPage.backToRuleDetailsLink).toBeVisible();

        await rulesManagementPage.goto({ kbnUrl, spaceId: scoutSpace.id });
        await expect(rulesManagementPage.ruleRow(DUPLICATE_RULE_NAME)).toBeVisible();
        await expect(rulesManagementPage.ruleSwitch(DUPLICATE_RULE_NAME)).toHaveAttribute(
          'aria-checked',
          'false'
        );
      }
    );
  }
);
