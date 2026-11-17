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
} from '../fixtures/esql_rule';

// The first run in a new space waits for the app to initialize before the form is editable
const TEST_TIMEOUT_MS = 3 * 60_000;
const RULE_NAME = 'ES|QL Rule';
const RULE_DESCRIPTION = 'The new rule description.';
const RULE_TAGS = ['test', 'newRule'];
const NAME_OVERRIDE_FIELD = 'test_id';
const CUSTOM_ESQL_FIELD = '_custom_agent_name';
const SUPPRESS_BY_FIELDS = [CUSTOM_ESQL_FIELD, 'agent.type'];

spaceTest.describe(
  'ES|QL rule creation',
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

    spaceTest(
      'creates an ES|QL rule that is listed in the rules table',
      async ({ pageObjects, kbnUrl, scoutSpace }) => {
        const { esqlRuleForm, ruleCreateWizard, ruleDetailsPage, rulesManagementPage } =
          pageObjects;
        const query = getEsqlRuleQuery(esqlSourceIndexName(scoutSpace.id));

        await spaceTest.step('fill the define step', async () => {
          await esqlRuleForm.setQueryAndWaitToSettle(query);
          await esqlRuleForm.continueToAboutStep();
        });

        await spaceTest.step('fill the about step', async () => {
          await ruleCreateWizard.waitForAboutStepEnabled();
          await ruleCreateWizard.aboutRuleName.fill(RULE_NAME);
          await ruleCreateWizard.aboutRuleDescription.fill(RULE_DESCRIPTION);
          await ruleCreateWizard.addTags(RULE_TAGS);
          await ruleCreateWizard.aboutContinue.click();
        });

        await spaceTest.step('fill the schedule step and create the rule', async () => {
          await ruleCreateWizard.setSchedule({
            interval: { amount: '100', unit: 'm' },
            lookback: { amount: '10', unit: 'm' },
          });
          await ruleCreateWizard.scheduleContinue.click();
          await ruleCreateWizard.createWithoutEnablingRule();
        });

        await spaceTest.step('the rule details show an ES|QL rule', async () => {
          await expect(ruleDetailsPage.header).toContainText(RULE_NAME);
          await expect(
            ruleDetailsPage.detailValue(ruleDetailsPage.definitionSection, 'Rule type')
          ).toHaveText('ES|QL');
          await expect(
            ruleDetailsPage.detailValue(ruleDetailsPage.definitionSection, 'ES|QL query')
          ).toContainText(query);
          await expect(
            ruleDetailsPage.detailValue(ruleDetailsPage.aboutSection, 'Tags')
          ).toHaveText(RULE_TAGS.join(''));
        });

        await spaceTest.step('the rules table lists the rule', async () => {
          await rulesManagementPage.goto({ kbnUrl, spaceId: scoutSpace.id });
          await expect(rulesManagementPage.customRulesFilter).toHaveText('Custom rules (1)');
          await expect(rulesManagementPage.ruleNameLink(RULE_NAME)).toHaveText(RULE_NAME);
        });
      }
    );

    // The options of the name override are the columns of the ES|QL query, not the fields of the
    // data view, so this case needs a query that adds a column of its own.
    spaceTest(
      'creates an ES|QL rule with a rule name override picked from the query columns',
      async ({ pageObjects, scoutSpace }) => {
        const { esqlRuleForm, ruleCreateWizard, ruleDetailsPage } = pageObjects;

        await esqlRuleForm.setQueryAndWaitToSettle(
          getEsqlRuleQuery(esqlSourceIndexName(scoutSpace.id))
        );
        await esqlRuleForm.continueToAboutStep();

        await ruleCreateWizard.waitForAboutStepEnabled();
        await ruleCreateWizard.aboutRuleName.fill(RULE_NAME);
        await ruleCreateWizard.aboutRuleDescription.fill(RULE_DESCRIPTION);
        await ruleCreateWizard.expandAdvancedSettings();
        await esqlRuleForm.selectRuleNameOverride(NAME_OVERRIDE_FIELD);
        await ruleCreateWizard.aboutContinue.click();

        await ruleCreateWizard.scheduleContinue.click();
        await ruleCreateWizard.createWithoutEnablingRule();

        await expect(
          ruleDetailsPage.detailValue(ruleDetailsPage.aboutSection, 'Rule name override')
        ).toHaveText(NAME_OVERRIDE_FIELD);
      }
    );

    spaceTest(
      'saves a custom ES|QL column as an investigation field',
      async ({ pageObjects, scoutSpace }) => {
        const { esqlRuleForm, ruleCreateWizard, ruleDetailsPage } = pageObjects;
        const query = [
          `from ${esqlSourceIndexName(scoutSpace.id)} metadata _id, _version, _index`,
          `eval ${CUSTOM_ESQL_FIELD} = agent.name`,
          `keep _id, ${CUSTOM_ESQL_FIELD}`,
          'limit 5',
        ].join(' | ');

        await esqlRuleForm.setQueryAndWaitToSettle(query);
        await esqlRuleForm.continueToAboutStep();

        await ruleCreateWizard.waitForAboutStepEnabled();
        await ruleCreateWizard.aboutRuleName.fill(RULE_NAME);
        await ruleCreateWizard.aboutRuleDescription.fill(RULE_DESCRIPTION);
        await ruleCreateWizard.expandAdvancedSettings();
        await esqlRuleForm.selectInvestigationFields([CUSTOM_ESQL_FIELD]);
        await ruleCreateWizard.aboutContinue.click();

        await ruleCreateWizard.scheduleContinue.click();
        await ruleCreateWizard.createWithoutEnablingRule();

        await expect(
          ruleDetailsPage.detailValue(ruleDetailsPage.aboutSection, 'Custom highlighted fields')
        ).toHaveText(CUSTOM_ESQL_FIELD);
      }
    );

    spaceTest(
      'saves alert suppression by a custom ES|QL column and a regular column for a time period',
      async ({ pageObjects, scoutSpace }) => {
        const { esqlRuleForm, ruleCreateWizard, ruleDetailsPage } = pageObjects;
        const { definitionSection } = ruleDetailsPage;
        const query = [
          `from ${esqlSourceIndexName(scoutSpace.id)} metadata _id, _version, _index`,
          `eval ${CUSTOM_ESQL_FIELD} = agent.name`,
        ].join(' | ');

        await spaceTest.step('configure suppression on the define step', async () => {
          await esqlRuleForm.setQueryAndWaitToSettle(query);
          await esqlRuleForm.selectSuppressionFields(SUPPRESS_BY_FIELDS);
          await esqlRuleForm.suppressPerTimePeriod.check();
          await esqlRuleForm.suppressionDurationValue.fill('2');
          await esqlRuleForm.suppressionDurationUnit.selectOption('h');
          await esqlRuleForm.continueToAboutStep();
        });

        await spaceTest.step('the define step summary shows the suppression', async () => {
          await expect(
            ruleDetailsPage.detailValue(definitionSection, 'Suppress alerts by')
          ).toHaveText(SUPPRESS_BY_FIELDS.join(''));
          await expect(
            ruleDetailsPage.detailValue(definitionSection, 'Suppress alerts for')
          ).toHaveText('2h');
        });

        await spaceTest.step('finish the wizard', async () => {
          await ruleCreateWizard.waitForAboutStepEnabled();
          await ruleCreateWizard.aboutRuleName.fill(RULE_NAME);
          await ruleCreateWizard.aboutRuleDescription.fill(RULE_DESCRIPTION);
          await ruleCreateWizard.aboutContinue.click();
          await ruleCreateWizard.scheduleContinue.click();
          await ruleCreateWizard.createWithoutEnablingRule();
        });

        await spaceTest.step('the rule details show the saved suppression', async () => {
          await expect(
            ruleDetailsPage.detailValue(definitionSection, 'Suppress alerts by')
          ).toHaveText(SUPPRESS_BY_FIELDS.join(''));
          await expect(
            ruleDetailsPage.detailValue(definitionSection, 'Suppress alerts for')
          ).toHaveText('2h');
        });
      }
    );
  }
);
