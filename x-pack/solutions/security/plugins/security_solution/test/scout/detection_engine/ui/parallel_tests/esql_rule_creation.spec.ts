/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, Locator, ScoutPage, SecurityPageObjects } from '@kbn/scout-security';
import { spaceTest, tags } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';

const RULE_NAME = 'Scout ES|QL rule';
const RULE_DESCRIPTION = 'Rule created by the Scout ES|QL rule creation spec';
const RULE_NAME_OVERRIDE = 'test_id';
const QUERY_BAR_TEST_SUBJ = 'ruleEsqlQueryBar';
const ESQL_RULE_TYPE_TEST_SUBJ = 'esqlRuleType';
const INVESTIGATION_FIELDS_TEST_SUBJ = 'detectionEngineStepAboutRuleInvestigationFields';
const RULE_NAME_OVERRIDE_TEST_SUBJ = 'detectionEngineStepAboutRuleRuleNameOverrideForEsqlRuleType';
const INVESTIGATION_FIELD = '_custom_agent_name';
const LONG_FLOW_EXTRA_TIMEOUT_MS = 120_000;
const QUERY_ERROR_RETRY_TIMEOUT_MS = 30_000;

// Each space gets its own source index: global setup loads no auditbeat data and one shared index
// name would race across parallel workers. Mappings alone are enough for ES|QL validation and
// column derivation.
const sourceIndexName = (spaceId: string): string =>
  `auditbeat-scout-esql-${spaceId.replace(/[^a-z0-9]/gi, '').toLowerCase()}`;

interface InvalidQueryCase {
  title: string;
  buildQuery: (index: string) => string;
  expectedError: string;
}

interface ConfirmationModalCase {
  title: string;
  buildQuery: (index: string) => string;
  expectedErrorText: string;
}

const INVALID_QUERY_CASES: InvalidQueryCase[] = [
  {
    title: 'shows error when ES|QL query is invalid',
    buildQuery: (index) => `from ${index} metadata _id, _version, _index | not_existing_operator`,
    expectedError: 'Error validating ES|QL',
  },
  {
    title: 'shows syntax error when query is syntactically invalid',
    buildQuery: (index) => `from ${index} | where true test`,
    expectedError: `Error validating ES|QL: "SyntaxError: extraneous input 'test' expecting <EOF>"`,
  },
];

const CONFIRMATION_MODAL_CASES: ConfirmationModalCase[] = [
  {
    title: 'shows confirmation modal about existing non-blocking validation errors',
    buildQuery: () => 'from fake metadata _id, _version, _index | limit 5',
    expectedErrorText: 'fake',
  },
  {
    title: 'shows confirmation modal when non-aggregating query drops _id',
    buildQuery: (index) => `from ${index} metadata _id, _version, _index | drop _id | limit 5`,
    expectedErrorText: '_id',
  },
];

type RuleCreateWizard = SecurityPageObjects['ruleCreateWizard'];

/** `ComboBoxField` spreads its test subject onto the form row, the EuiComboBox itself is `input`. */
const formFieldComboBox = (page: ScoutPage, rowTestSubj: string) =>
  page.components.comboBox('input', page.testSubj.locator(rowTestSubj));

/** Opens the create wizard in the worker space and switches the rule type to ES|QL. */
const openEsqlWizard = async (
  page: ScoutPage,
  kbnUrl: KibanaUrl,
  spaceId: string,
  ruleCreateWizard: RuleCreateWizard
) => {
  await page.goto(kbnUrl.app('security/rules/create', { space: spaceId }));
  await expect(ruleCreateWizard.defineStep).toBeVisible();
  await page.testSubj.locator(ESQL_RULE_TYPE_TEST_SUBJ).click();
  await expect(page.testSubj.locator(QUERY_BAR_TEST_SUBJ)).toBeVisible();
};

/**
 * Clicks "Continue" until the About step is open. The click races async query validation: it can
 * be swallowed, so click only while About is not visible and gate on visible AND editable.
 */
const continueDefineStep = async (ruleCreateWizard: RuleCreateWizard) => {
  const { defineContinue, aboutRuleName } = ruleCreateWizard;
  await expect(defineContinue).toBeEnabled({ timeout: 60_000 });
  await expect(async () => {
    if (!(await aboutRuleName.isVisible())) {
      await defineContinue.click({ timeout: 5_000 });
    }
    await expect(aboutRuleName).toBeVisible({ timeout: 5_000 });
    await expect(aboutRuleName).toBeEditable({ timeout: 5_000 });
  }).toPass({ timeout: 60_000 });
};

/**
 * Clicks "Continue" on the About step and waits for the Schedule step. The click races
 * About-step validation: it can be swallowed, so click only while Schedule is not visible.
 */
const continueAboutStep = async (ruleCreateWizard: RuleCreateWizard) => {
  const { aboutContinue, scheduleContinue } = ruleCreateWizard;
  await expect(async () => {
    if (!(await scheduleContinue.isVisible())) {
      await aboutContinue.click({ timeout: 5_000 });
    }
    await expect(scheduleContinue).toBeVisible({ timeout: 5_000 });
    await expect(scheduleContinue).toBeEnabled({ timeout: 5_000 });
  }).toPass({ timeout: 60_000 });
};

/** Clicks "Continue" with a pending validation possibly swallowing the first click. */
const expectQueryBarErrorOnContinue = async (
  ruleCreateWizard: RuleCreateWizard,
  queryBar: Locator,
  expectedError: string
) => {
  await expect(ruleCreateWizard.defineContinue).toBeEnabled({ timeout: 60_000 });
  await expect(async () => {
    await ruleCreateWizard.defineContinue.click({ timeout: 5_000 });
    await expect(queryBar).toContainText(expectedError, { timeout: 5_000 });
  }).toPass({ timeout: QUERY_ERROR_RETRY_TIMEOUT_MS });
};

// Stateful classic only: the serverless lane has no repeated green runs yet. Add
// `...tags.serverless.security.complete` (via `getPlaywrightTagsFor(...)`) once it does.
spaceTest.describe(
  'Detection ES|QL rules - Rule Creation',
  { tag: [...tags.stateful.classic] },
  () => {
    spaceTest.beforeAll(async ({ esClient, scoutSpace }) => {
      const index = sourceIndexName(scoutSpace.id);
      await esClient.indices.delete({ index, ignore_unavailable: true });
      await esClient.indices.create({
        index,
        mappings: {
          properties: {
            '@timestamp': { type: 'date' },
            agent: { properties: { name: { type: 'keyword' } } },
          },
        },
      });
    });

    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsPlatformEngineer();
    });

    spaceTest.afterEach(async ({ apiServices }) => {
      await apiServices.detectionRule.deleteAll();
      await apiServices.detectionAlerts.deleteAll();
    });

    spaceTest.afterAll(async ({ esClient, scoutSpace }) => {
      await esClient.indices.delete({
        index: sourceIndexName(scoutSpace.id),
        ignore_unavailable: true,
      });
    });

    // Revived: effectively skipped in Cypress on main (describe.skip, issues #257365 and #257364).
    // Stays active only while repeated runs stay green.
    spaceTest(
      'creates an ES|QL rule',
      async ({ page, kbnUrl, scoutSpace, pageObjects }, testInfo) => {
        testInfo.setTimeout(testInfo.timeout + LONG_FLOW_EXTRA_TIMEOUT_MS);
        const { ruleCreateWizard, ruleDetailsPage, rulesManagementPage, esqlEditor } = pageObjects;
        const index = sourceIndexName(scoutSpace.id);
        const query = `from ${index} metadata _id, _version, _index | keep agent.name, _id`;

        await openEsqlWizard(page, kbnUrl, scoutSpace.id, ruleCreateWizard);
        await esqlEditor.inContainer(QUERY_BAR_TEST_SUBJ).setQuery(query);
        await continueDefineStep(ruleCreateWizard);

        await ruleCreateWizard.aboutRuleName.fill(RULE_NAME);
        await ruleCreateWizard.aboutRuleDescription.fill(RULE_DESCRIPTION);
        await continueAboutStep(ruleCreateWizard);
        await ruleCreateWizard.scheduleContinue.click();
        await ruleCreateWizard.createWithoutEnablingRule();

        await expect(ruleDetailsPage.header).toContainText(RULE_NAME);
        await expect(
          ruleDetailsPage.detailValue(ruleDetailsPage.definitionSection, 'Rule type')
        ).toHaveText('ES|QL');

        await rulesManagementPage.goto({ kbnUrl, spaceId: scoutSpace.id });
        await expect(rulesManagementPage.ruleRow(RULE_NAME)).toHaveCount(1);
        await expect(rulesManagementPage.ruleNameLink(RULE_NAME)).toHaveText(RULE_NAME);
      }
    );

    // Skipped in Cypress and kept skipped here: https://github.com/elastic/kibana/issues/240136
    spaceTest.skip(
      'creates an ES|QL rule and overrides its name',
      async ({ page, kbnUrl, scoutSpace, pageObjects }, testInfo) => {
        testInfo.setTimeout(testInfo.timeout + LONG_FLOW_EXTRA_TIMEOUT_MS);
        const { ruleCreateWizard, ruleDetailsPage, esqlEditor } = pageObjects;
        const index = sourceIndexName(scoutSpace.id);
        const query = `from ${index} metadata _id, _version, _index | keep agent.name, _id | eval test_id = _id`;

        await openEsqlWizard(page, kbnUrl, scoutSpace.id, ruleCreateWizard);
        await esqlEditor.inContainer(QUERY_BAR_TEST_SUBJ).setQuery(query);
        await continueDefineStep(ruleCreateWizard);

        await ruleCreateWizard.aboutRuleName.fill(RULE_NAME);
        await ruleCreateWizard.aboutRuleDescription.fill(RULE_DESCRIPTION);
        await ruleCreateWizard.expandAdvancedSettings();
        await formFieldComboBox(page, RULE_NAME_OVERRIDE_TEST_SUBJ).setSelectedOptions(
          [RULE_NAME_OVERRIDE],
          { timeout: 60_000 }
        );
        await continueAboutStep(ruleCreateWizard);
        await ruleCreateWizard.scheduleContinue.click();
        await ruleCreateWizard.createWithoutEnablingRule();

        await expect(
          ruleDetailsPage.detailValue(ruleDetailsPage.aboutSection, 'Rule name override')
        ).toHaveText(RULE_NAME_OVERRIDE);
      }
    );

    // Revived: effectively skipped in Cypress on main (describe.skip, issue #257365).
    spaceTest(
      'shows error when ES|QL query is empty and proceeds once the query is fixed',
      async ({ page, kbnUrl, scoutSpace, pageObjects }, testInfo) => {
        testInfo.setTimeout(testInfo.timeout + LONG_FLOW_EXTRA_TIMEOUT_MS);
        const { ruleCreateWizard, esqlEditor } = pageObjects;
        const queryBar = page.testSubj.locator(QUERY_BAR_TEST_SUBJ);
        const query = `from ${sourceIndexName(scoutSpace.id)} metadata _id, _version, _index`;

        await openEsqlWizard(page, kbnUrl, scoutSpace.id, ruleCreateWizard);

        await spaceTest.step('shows the required error for an empty query', async () => {
          await expectQueryBarErrorOnContinue(
            ruleCreateWizard,
            queryBar,
            'ES|QL query is required'
          );
        });

        await spaceTest.step('moves on to About once the query is valid', async () => {
          await esqlEditor.inContainer(QUERY_BAR_TEST_SUBJ).setQuery(query);
          await continueDefineStep(ruleCreateWizard);
          await expect(queryBar).toBeHidden();
        });
      }
    );

    // Revived: effectively skipped in Cypress on main (describe.skip, issue #257365).
    spaceTest(
      'allows non-aggregating ES|QL query without metadata operator (auto-injected at execution)',
      async ({ page, kbnUrl, scoutSpace, pageObjects }, testInfo) => {
        testInfo.setTimeout(testInfo.timeout + LONG_FLOW_EXTRA_TIMEOUT_MS);
        const { ruleCreateWizard, esqlEditor } = pageObjects;
        const queryBar = page.testSubj.locator(QUERY_BAR_TEST_SUBJ);

        await openEsqlWizard(page, kbnUrl, scoutSpace.id, ruleCreateWizard);
        await esqlEditor
          .inContainer(QUERY_BAR_TEST_SUBJ)
          .setQuery(`from ${sourceIndexName(scoutSpace.id)} | limit 5`);
        await continueDefineStep(ruleCreateWizard);

        await expect(queryBar).not.toContainText('metadata _id');
      }
    );

    // Revived: effectively skipped in Cypress on main (describe.skip, issue #257365).
    for (const { title, buildQuery, expectedError } of INVALID_QUERY_CASES) {
      spaceTest(title, async ({ page, kbnUrl, scoutSpace, pageObjects }, testInfo) => {
        testInfo.setTimeout(testInfo.timeout + LONG_FLOW_EXTRA_TIMEOUT_MS);
        const { ruleCreateWizard, esqlEditor } = pageObjects;
        const queryBar = page.testSubj.locator(QUERY_BAR_TEST_SUBJ);

        await openEsqlWizard(page, kbnUrl, scoutSpace.id, ruleCreateWizard);
        await esqlEditor
          .inContainer(QUERY_BAR_TEST_SUBJ)
          .setQuery(buildQuery(sourceIndexName(scoutSpace.id)));

        await expectQueryBarErrorOnContinue(ruleCreateWizard, queryBar, expectedError);
      });
    }

    // Revived: effectively skipped in Cypress on main (describe.skip, issue #257365).
    for (const { title, buildQuery, expectedErrorText } of CONFIRMATION_MODAL_CASES) {
      spaceTest(title, async ({ page, kbnUrl, scoutSpace, pageObjects }, testInfo) => {
        testInfo.setTimeout(testInfo.timeout + LONG_FLOW_EXTRA_TIMEOUT_MS);
        const { ruleCreateWizard, ruleEditPage, esqlEditor } = pageObjects;
        const { saveWithWarningsModal } = ruleEditPage;

        await openEsqlWizard(page, kbnUrl, scoutSpace.id, ruleCreateWizard);
        await esqlEditor
          .inContainer(QUERY_BAR_TEST_SUBJ)
          .setQuery(buildQuery(sourceIndexName(scoutSpace.id)));
        await continueDefineStep(ruleCreateWizard);

        await ruleCreateWizard.aboutRuleName.fill(RULE_NAME);
        await ruleCreateWizard.aboutRuleDescription.fill(RULE_DESCRIPTION);
        await continueAboutStep(ruleCreateWizard);
        await ruleCreateWizard.scheduleContinue.click();
        await ruleCreateWizard.createAndEnable.click();

        await expect(saveWithWarningsModal).toBeVisible();
        await expect(saveWithWarningsModal).toContainText(expectedErrorText);

        await ruleEditPage.saveWithWarningsConfirmButton.click();
        await expect(saveWithWarningsModal).toBeHidden();
        await expect(ruleCreateWizard.createAndEnable).toBeHidden();
      });
    }

    // Revived: effectively skipped in Cypress on main (describe.skip, issue #257365).
    spaceTest(
      'shows custom ES|QL field in investigation fields autocomplete and saves it in rule',
      async ({ page, kbnUrl, scoutSpace, pageObjects }, testInfo) => {
        testInfo.setTimeout(testInfo.timeout + LONG_FLOW_EXTRA_TIMEOUT_MS);
        const { ruleCreateWizard, esqlEditor } = pageObjects;
        const index = sourceIndexName(scoutSpace.id);
        const query =
          `from ${index} metadata _id, _version, _index | eval ${INVESTIGATION_FIELD} = agent.name` +
          ` | keep _id, ${INVESTIGATION_FIELD} | limit 5`;

        await openEsqlWizard(page, kbnUrl, scoutSpace.id, ruleCreateWizard);
        await esqlEditor.inContainer(QUERY_BAR_TEST_SUBJ).setQuery(query);
        await continueDefineStep(ruleCreateWizard);

        await ruleCreateWizard.aboutRuleName.fill(RULE_NAME);
        await ruleCreateWizard.aboutRuleDescription.fill(RULE_DESCRIPTION);
        await ruleCreateWizard.expandAdvancedSettings();
        await formFieldComboBox(page, INVESTIGATION_FIELDS_TEST_SUBJ).setSelectedOptions(
          [INVESTIGATION_FIELD],
          { timeout: 60_000 }
        );
        await continueAboutStep(ruleCreateWizard);
        await ruleCreateWizard.scheduleContinue.click();
        await ruleCreateWizard.createWithoutEnablingRule();

        await expect(page.getByTestId('investigationFieldsPropertyValueItem')).toContainText(
          INVESTIGATION_FIELD
        );
      }
    );
  }
);
