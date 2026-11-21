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
  getEsqlRuleQuery,
  MISSING_ESQL_SOURCE,
} from '../fixtures/esql_rule';

// The first run in a new space waits for the app to initialize before the form is editable
const TEST_TIMEOUT_MS = 3 * 60_000;
const RULE_NAME = 'ES|QL validation rule';
const RULE_DESCRIPTION = 'The rule description.';

spaceTest.describe(
  'ES|QL rule creation: query validation',
  {
    tag: [...tags.stateful.classic, ...tags.serverless.security.complete],
  },
  () => {
    spaceTest.setTimeout(TEST_TIMEOUT_MS);

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

    spaceTest('shows an error when the ES|QL query is empty', async ({ pageObjects }) => {
      const { esqlRuleForm } = pageObjects;

      await esqlRuleForm.continueFromDefineStep();

      await expect(esqlRuleForm.queryBar).toContainText('ES|QL query is required');
    });

    spaceTest(
      'proceeds to the about step once the empty query is fixed',
      async ({ pageObjects, scoutSpace }) => {
        const { esqlRuleForm, ruleCreateWizard } = pageObjects;

        await esqlRuleForm.continueFromDefineStep();
        await expect(esqlRuleForm.queryBar).toContainText('required');

        await esqlRuleForm.setQueryAndWaitToSettle(
          getEsqlRuleQuery(esqlSourceIndexName(scoutSpace.id))
        );
        await esqlRuleForm.continueToAboutStep();

        await expect(esqlRuleForm.queryBar).toBeHidden();
        await expect(ruleCreateWizard.aboutRuleName).toBeVisible();
      }
    );

    spaceTest(
      'accepts a non-aggregating query without the metadata operator',
      async ({ pageObjects, scoutSpace }) => {
        const { esqlRuleForm, ruleCreateWizard } = pageObjects;
        // The metadata operator is added when the rule runs, not in the form
        const query = `from ${esqlSourceIndexName(scoutSpace.id)} | limit 5`;

        await esqlRuleForm.setQueryAndWaitToSettle(query);
        expect(await esqlRuleForm.esqlEditor.getQuery()).toBe(query);
        await esqlRuleForm.continueToAboutStep();

        await expect(esqlRuleForm.queryBar).toBeHidden();
        await expect(ruleCreateWizard.aboutRuleName).toBeVisible();
      }
    );

    spaceTest('shows an error when the query uses an unknown operator', async ({ pageObjects }) => {
      const { esqlRuleForm } = pageObjects;

      await esqlRuleForm.setQueryAndWaitToSettle(
        'from auditbeat* metadata _id, _version, _index | not_existing_operator'
      );
      await esqlRuleForm.continueFromDefineStep();

      await expect(esqlRuleForm.queryBar).toContainText('Error validating ES|QL');
    });

    spaceTest('shows a syntax error when the query is not valid ES|QL', async ({ pageObjects }) => {
      const { esqlRuleForm } = pageObjects;

      await esqlRuleForm.setQueryAndWaitToSettle('from auditbeat* | where true test');
      await esqlRuleForm.continueFromDefineStep();

      await expect(esqlRuleForm.queryBar).toContainText(
        `Error validating ES|QL: "SyntaxError: extraneous input 'test' expecting <EOF>"`
      );
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
        await expect(esqlRuleForm.saveWithErrorsModal).toBeVisible();

        await esqlRuleForm.confirmSaveWithErrors();
        await expect(esqlRuleForm.saveWithErrorsModal).toBeHidden();
        await expect(ruleDetailsPage.header).toContainText(RULE_NAME);
      }
    );

    spaceTest(
      'asks for confirmation when a non-aggregating query drops the _id column',
      async ({ pageObjects, scoutSpace }) => {
        const { esqlRuleForm, ruleCreateWizard, ruleDetailsPage } = pageObjects;

        await esqlRuleForm.setQueryAndWaitToSettle(
          `from ${esqlSourceIndexName(
            scoutSpace.id
          )} metadata _id, _version, _index | drop _id | limit 5`
        );
        await esqlRuleForm.continueToAboutStep();

        await ruleCreateWizard.waitForAboutStepEnabled();
        await ruleCreateWizard.aboutRuleName.fill(RULE_NAME);
        await ruleCreateWizard.aboutRuleDescription.fill(RULE_DESCRIPTION);
        await ruleCreateWizard.aboutContinue.click();
        await ruleCreateWizard.scheduleContinue.click();

        await ruleCreateWizard.createWithoutEnabling.click();
        await expect(esqlRuleForm.saveWithErrorsModal).toBeVisible();

        await esqlRuleForm.confirmSaveWithErrors();
        await expect(esqlRuleForm.saveWithErrorsModal).toBeHidden();
        await expect(ruleDetailsPage.header).toContainText(RULE_NAME);
      }
    );
  }
);
