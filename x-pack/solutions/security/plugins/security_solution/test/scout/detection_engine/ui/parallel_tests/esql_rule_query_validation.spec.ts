/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest, tags } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';
import {
  createEsqlSourceIndex,
  deleteEsqlSourceIndex,
  esqlSourceIndexName,
  MISSING_ESQL_SOURCE,
} from '../fixtures/esql_rule';

const RULE_NAME = 'ES|QL validation rule';
const RULE_DESCRIPTION = 'The rule description.';

spaceTest.describe(
  'ES|QL rule creation: query validation',
  {
    tag: [...tags.stateful.classic, ...tags.serverless.security.complete],
  },
  () => {
    spaceTest.beforeAll(async ({ esClient, scoutSpace }) => {
      await createEsqlSourceIndex(esClient, esqlSourceIndexName(scoutSpace.id));
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects, kbnUrl, scoutSpace }) => {
      await browserAuth.loginAsPlatformEngineer();
      await pageObjects.esqlRuleForm.gotoCreateEsqlRule({ kbnUrl, spaceId: scoutSpace.id });
    });

    spaceTest.afterEach(async ({ apiServices }) => {
      await apiServices.detectionRule.deleteAll();
    });

    spaceTest.afterAll(async ({ esClient, scoutSpace }) => {
      await deleteEsqlSourceIndex(esClient, esqlSourceIndexName(scoutSpace.id));
    });

    spaceTest('shows an error when the query uses an unknown operator', async ({ pageObjects }) => {
      const { esqlRuleForm } = pageObjects;

      await esqlRuleForm.setQueryAndWaitToSettle(
        'from auditbeat* metadata _id, _version, _index | not_existing_operator'
      );
      await esqlRuleForm.continueFromDefineStep();

      await expect(esqlRuleForm.queryBar).toContainText('Error validating ES|QL');
    });

    spaceTest(
      'asks for confirmation when the query has a non-blocking validation error',
      async ({ pageObjects }) => {
        const { esqlRuleForm, ruleCreateWizard, ruleDetailsPage } = pageObjects;

        await esqlRuleForm.setQueryAndWaitToSettle(
          `from ${MISSING_ESQL_SOURCE} metadata _id, _version, _index | limit 5`
        );
        await esqlRuleForm.continueToAboutStep();

        await ruleCreateWizard.waitForAboutStepEnabled();
        await ruleCreateWizard.aboutRuleName.fill(RULE_NAME);
        await ruleCreateWizard.aboutRuleDescription.fill(RULE_DESCRIPTION);
        await ruleCreateWizard.aboutContinue.click();
        await ruleCreateWizard.scheduleContinue.click();

        await ruleCreateWizard.createWithoutEnabling.click();
        await expect(ruleCreateWizard.saveWithErrorsModal).toBeVisible();

        await ruleCreateWizard.confirmSaveWithErrors();
        await expect(ruleCreateWizard.saveWithErrorsModal).toBeHidden();
        await expect(ruleDetailsPage.header).toContainText(RULE_NAME);
      }
    );
  }
);
