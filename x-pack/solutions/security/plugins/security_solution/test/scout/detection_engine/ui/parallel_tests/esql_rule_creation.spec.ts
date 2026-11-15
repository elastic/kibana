/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, ScoutPage, SecurityPageObjects } from '@kbn/scout-security';
import { spaceTest, tags } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';

const RULE_NAME = 'Scout ES|QL rule';
const RULE_DESCRIPTION = 'Rule created by the Scout ES|QL rule creation spec';
const RULE_NAME_OVERRIDE = 'test_id';
const INVESTIGATION_FIELD = '_custom_agent_name';
// Full wizard flows chain several helper waits of up to 60 s each (Continue enabled after
// ES|QL validation, step navigation retries), which can exceed the default per-test budget.
const LONG_FLOW_EXTRA_TIMEOUT_MS = 120_000;
const QUERY_ERROR_RETRY_TIMEOUT_MS = 30_000;
// ES|QL validation and field-list loading are async; Continue stays disabled and combo-box
// options stay empty until they settle, which can take tens of seconds on a cold worker.
const ASYNC_VALIDATION_TIMEOUT_MS = 60_000;
// One attempt inside a toPass retry loop: short, so a click that raced validation is retried.
const RETRY_ATTEMPT_TIMEOUT_MS = 5_000;
// The first load of the create page and the save-then-redirect to rule details both outlast the
// default 10 s expect timeout on a cold serverless project.
const PAGE_TRANSITION_TIMEOUT_MS = 60_000;

// Each space gets its own source index: global setup loads no auditbeat data and one shared index
// name would race across parallel workers. Mappings alone are enough for ES|QL validation and
// column derivation.
const sourceIndexName = (spaceId: string): string =>
  `auditbeat-scout-esql-${spaceId.replace(/[^a-z0-9]/gi, '').toLowerCase()}`;

type RuleCreateWizard = SecurityPageObjects['ruleCreateWizard'];

/** Opens the create wizard in the worker space and switches the rule type to ES|QL. */
const openEsqlWizard = async (
  page: ScoutPage,
  kbnUrl: KibanaUrl,
  spaceId: string,
  ruleCreateWizard: RuleCreateWizard
) => {
  await page.goto(kbnUrl.app('security/rules/create', { space: spaceId }));
  await expect(ruleCreateWizard.defineStep).toBeVisible({ timeout: PAGE_TRANSITION_TIMEOUT_MS });
  await ruleCreateWizard.selectEsqlRuleType();
};

/**
 * Clicks "Continue" until the About step is open. The click races async query validation: it can
 * be swallowed, so click only while About is not visible and gate on visible AND editable.
 */
const continueDefineStep = async (ruleCreateWizard: RuleCreateWizard) => {
  const { defineContinue, aboutRuleName } = ruleCreateWizard;
  await expect(defineContinue).toBeEnabled({ timeout: ASYNC_VALIDATION_TIMEOUT_MS });
  await expect(async () => {
    if (!(await aboutRuleName.isVisible())) {
      await defineContinue.click({ timeout: RETRY_ATTEMPT_TIMEOUT_MS });
    }
    await expect(aboutRuleName).toBeVisible({ timeout: RETRY_ATTEMPT_TIMEOUT_MS });
    await expect(aboutRuleName).toBeEditable({ timeout: RETRY_ATTEMPT_TIMEOUT_MS });
  }).toPass({ timeout: ASYNC_VALIDATION_TIMEOUT_MS });
};

/**
 * Clicks "Continue" on the About step and waits for the Schedule step. The click races
 * About-step validation: it can be swallowed, so click only while Schedule is not visible.
 */
const continueAboutStep = async (ruleCreateWizard: RuleCreateWizard) => {
  const { aboutContinue, scheduleContinue } = ruleCreateWizard;
  await expect(async () => {
    if (!(await scheduleContinue.isVisible())) {
      await aboutContinue.click({ timeout: RETRY_ATTEMPT_TIMEOUT_MS });
    }
    await expect(scheduleContinue).toBeVisible({ timeout: RETRY_ATTEMPT_TIMEOUT_MS });
    await expect(scheduleContinue).toBeEnabled({ timeout: RETRY_ATTEMPT_TIMEOUT_MS });
  }).toPass({ timeout: ASYNC_VALIDATION_TIMEOUT_MS });
};

/** Clicks "Continue" with a pending validation possibly swallowing the first click. */
const expectQueryBarErrorOnContinue = async (
  ruleCreateWizard: RuleCreateWizard,
  expectedError: string
) => {
  await expect(ruleCreateWizard.defineContinue).toBeEnabled({
    timeout: ASYNC_VALIDATION_TIMEOUT_MS,
  });
  await expect(async () => {
    await ruleCreateWizard.defineContinue.click({ timeout: RETRY_ATTEMPT_TIMEOUT_MS });
    await expect(ruleCreateWizard.esqlQueryBar).toContainText(expectedError, {
      timeout: RETRY_ATTEMPT_TIMEOUT_MS,
    });
  }).toPass({ timeout: QUERY_ERROR_RETRY_TIMEOUT_MS });
};

spaceTest.describe(
  'Detection ES|QL rules - Rule Creation',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
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
    spaceTest(
      'creates an ES|QL rule',
      async ({ page, kbnUrl, scoutSpace, pageObjects }, testInfo) => {
        testInfo.setTimeout(testInfo.timeout + LONG_FLOW_EXTRA_TIMEOUT_MS);
        const { ruleCreateWizard, ruleDetailsPage, rulesManagementPage } = pageObjects;
        const index = sourceIndexName(scoutSpace.id);
        const query = `from ${index} metadata _id, _version, _index | keep agent.name, _id`;

        await openEsqlWizard(page, kbnUrl, scoutSpace.id, ruleCreateWizard);
        await ruleCreateWizard.setEsqlQuery(query);
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
        const { ruleCreateWizard, ruleDetailsPage } = pageObjects;
        const index = sourceIndexName(scoutSpace.id);
        const query = `from ${index} metadata _id, _version, _index | keep agent.name, _id | eval test_id = _id`;

        await openEsqlWizard(page, kbnUrl, scoutSpace.id, ruleCreateWizard);
        await ruleCreateWizard.setEsqlQuery(query);
        await continueDefineStep(ruleCreateWizard);

        await ruleCreateWizard.aboutRuleName.fill(RULE_NAME);
        await ruleCreateWizard.aboutRuleDescription.fill(RULE_DESCRIPTION);
        await ruleCreateWizard.expandAdvancedSettings();
        await ruleCreateWizard.setRuleNameOverride(RULE_NAME_OVERRIDE, ASYNC_VALIDATION_TIMEOUT_MS);
        await continueAboutStep(ruleCreateWizard);
        await ruleCreateWizard.scheduleContinue.click();
        await ruleCreateWizard.createWithoutEnablingRule();

        await expect(
          ruleDetailsPage.detailValue(ruleDetailsPage.aboutSection, 'Rule name override')
        ).toHaveText(RULE_NAME_OVERRIDE);
      }
    );

    // Revived: effectively skipped in Cypress on main (describe.skip, issue #257365).
    // The required-query message itself is also unit tested in `step_define_rule.test.tsx`.
    spaceTest(
      'shows error when ES|QL query is empty and proceeds once the query is fixed',
      async ({ page, kbnUrl, scoutSpace, pageObjects }, testInfo) => {
        testInfo.setTimeout(testInfo.timeout + LONG_FLOW_EXTRA_TIMEOUT_MS);
        const { ruleCreateWizard } = pageObjects;
        const query = `from ${sourceIndexName(scoutSpace.id)} metadata _id, _version, _index`;

        await openEsqlWizard(page, kbnUrl, scoutSpace.id, ruleCreateWizard);

        await spaceTest.step('shows the required error for an empty query', async () => {
          await expectQueryBarErrorOnContinue(ruleCreateWizard, 'ES|QL query is required');
        });

        await spaceTest.step('moves on to About once the query is valid', async () => {
          await ruleCreateWizard.setEsqlQuery(query);
          await continueDefineStep(ruleCreateWizard);
          await expect(ruleCreateWizard.esqlQueryBar).toBeHidden();
        });
      }
    );

    // Revived: effectively skipped in Cypress on main (describe.skip, issue #257365).
    // Rendering of the validator error under the query bar. The messages for syntax errors and
    // a missing `_id` are unit tested in `esql_query_validator_factory.test.ts`.
    spaceTest(
      'shows error when ES|QL query is invalid',
      async ({ page, kbnUrl, scoutSpace, pageObjects }, testInfo) => {
        testInfo.setTimeout(testInfo.timeout + LONG_FLOW_EXTRA_TIMEOUT_MS);
        const { ruleCreateWizard } = pageObjects;
        const index = sourceIndexName(scoutSpace.id);

        await openEsqlWizard(page, kbnUrl, scoutSpace.id, ruleCreateWizard);
        await ruleCreateWizard.setEsqlQuery(
          `from ${index} metadata _id, _version, _index | not_existing_operator`
        );

        await expectQueryBarErrorOnContinue(ruleCreateWizard, 'Error validating ES|QL');
      }
    );

    // Revived: effectively skipped in Cypress on main (describe.skip, issue #257365).
    // The missing-data-source error is non-blocking and only the server can report it.
    spaceTest(
      'shows confirmation modal about existing non-blocking validation errors',
      async ({ page, kbnUrl, scoutSpace, pageObjects }, testInfo) => {
        testInfo.setTimeout(testInfo.timeout + LONG_FLOW_EXTRA_TIMEOUT_MS);
        const { ruleCreateWizard, ruleEditPage, ruleDetailsPage } = pageObjects;
        const { saveWithWarningsModal } = ruleEditPage;

        await openEsqlWizard(page, kbnUrl, scoutSpace.id, ruleCreateWizard);
        await ruleCreateWizard.setEsqlQuery('from fake metadata _id, _version, _index | limit 5');
        await continueDefineStep(ruleCreateWizard);

        await ruleCreateWizard.aboutRuleName.fill(RULE_NAME);
        await ruleCreateWizard.aboutRuleDescription.fill(RULE_DESCRIPTION);
        await continueAboutStep(ruleCreateWizard);
        await ruleCreateWizard.scheduleContinue.click();
        await ruleCreateWizard.createAndEnable.click();

        await expect(saveWithWarningsModal).toBeVisible();
        await expect(saveWithWarningsModal).toContainText('fake');

        await ruleEditPage.saveWithWarningsConfirmButton.click();
        await expect(saveWithWarningsModal).toBeHidden();
        // The save is still in flight while the disabled button stays mounted; the rule details
        // page is the signal that the rule was created despite the warning.
        await expect(ruleDetailsPage.header).toContainText(RULE_NAME, {
          timeout: PAGE_TRANSITION_TIMEOUT_MS,
        });
        await expect(ruleCreateWizard.createAndEnable).toBeHidden();
      }
    );

    // Revived: effectively skipped in Cypress on main (describe.skip, issue #257365).
    spaceTest(
      'shows custom ES|QL field in investigation fields autocomplete and saves it in rule',
      async ({ page, kbnUrl, scoutSpace, pageObjects }, testInfo) => {
        testInfo.setTimeout(testInfo.timeout + LONG_FLOW_EXTRA_TIMEOUT_MS);
        const { ruleCreateWizard, ruleDetailsPage } = pageObjects;
        const index = sourceIndexName(scoutSpace.id);
        const query =
          `from ${index} metadata _id, _version, _index | eval ${INVESTIGATION_FIELD} = agent.name` +
          ` | keep _id, ${INVESTIGATION_FIELD} | limit 5`;

        await openEsqlWizard(page, kbnUrl, scoutSpace.id, ruleCreateWizard);
        await ruleCreateWizard.setEsqlQuery(query);
        await continueDefineStep(ruleCreateWizard);

        await ruleCreateWizard.aboutRuleName.fill(RULE_NAME);
        await ruleCreateWizard.aboutRuleDescription.fill(RULE_DESCRIPTION);
        await ruleCreateWizard.expandAdvancedSettings();
        await ruleCreateWizard.setInvestigationFields(
          [INVESTIGATION_FIELD],
          ASYNC_VALIDATION_TIMEOUT_MS
        );
        await continueAboutStep(ruleCreateWizard);
        await ruleCreateWizard.scheduleContinue.click();
        await ruleCreateWizard.createWithoutEnablingRule();

        await expect(ruleDetailsPage.investigationFieldValues).toHaveText(INVESTIGATION_FIELD);
      }
    );
  }
);
