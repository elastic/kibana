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
// Query-error flows never pass the About step, but the editor mount and the Continue retry
// loops (up to 60 s each) can still exceed the default per-test budget on a cold project.
const DEFINE_STEP_EXTRA_TIMEOUT_MS = 60_000;
// ES|QL field-list loading is async; combo-box options stay empty until it settles, which can
// take tens of seconds on a cold worker.
const FIELD_OPTIONS_TIMEOUT_MS = 60_000;
// The first load of the create page and the save-then-redirect to rule details both outlast the
// default 10 s expect timeout on a cold serverless project.
const PAGE_TRANSITION_TIMEOUT_MS = 60_000;

// Each space gets its own source index: global setup loads no auditbeat data and one shared index
// name would race across parallel workers. Mappings alone are enough for ES|QL validation and
// column derivation.
const sourceIndexName = (spaceId: string): string =>
  `auditbeat-scout-esql-${spaceId.replace(/[^a-z0-9]/gi, '').toLowerCase()}`;

type RuleCreateWizard = SecurityPageObjects['ruleCreateWizard'];

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

spaceTest.describe(
  'Detection ES|QL rules - Rule Creation',
  // The Cypress source skipped serverless MKI (@skipInServerlessMKI); keep that until it is run there.
  { tag: [...tags.stateful.classic, '@local-serverless-security_complete'] },
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
      const results = await Promise.allSettled([
        apiServices.detectionRule.deleteAll(),
        apiServices.detectionAlerts.deleteAll(),
      ]);
      const failures = results.flatMap((result) =>
        result.status === 'rejected' ? [result.reason] : []
      );
      if (failures.length > 0) {
        throw new AggregateError(failures, 'ES|QL rule creation cleanup failed');
      }
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
        await ruleCreateWizard.continueFromDefineStep();

        await ruleCreateWizard.aboutRuleName.fill(RULE_NAME);
        await ruleCreateWizard.aboutRuleDescription.fill(RULE_DESCRIPTION);
        await ruleCreateWizard.continueFromAboutStep();
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
        await ruleCreateWizard.continueFromDefineStep();

        await ruleCreateWizard.aboutRuleName.fill(RULE_NAME);
        await ruleCreateWizard.aboutRuleDescription.fill(RULE_DESCRIPTION);
        await ruleCreateWizard.expandAdvancedSettings();
        await ruleCreateWizard.setRuleNameOverride(RULE_NAME_OVERRIDE, FIELD_OPTIONS_TIMEOUT_MS);
        await ruleCreateWizard.continueFromAboutStep();
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
        testInfo.setTimeout(testInfo.timeout + DEFINE_STEP_EXTRA_TIMEOUT_MS);
        const { ruleCreateWizard } = pageObjects;
        const query = `from ${sourceIndexName(scoutSpace.id)} metadata _id, _version, _index`;

        await openEsqlWizard(page, kbnUrl, scoutSpace.id, ruleCreateWizard);

        await spaceTest.step('shows the required error for an empty query', async () => {
          await ruleCreateWizard.continueFromDefineStepUntilQueryError('ES|QL query is required');
          await expect(ruleCreateWizard.aboutRuleName).toBeHidden();
        });

        await spaceTest.step('moves on to About once the query is valid', async () => {
          await ruleCreateWizard.setEsqlQuery(query);
          await ruleCreateWizard.continueFromDefineStep();
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
        testInfo.setTimeout(testInfo.timeout + DEFINE_STEP_EXTRA_TIMEOUT_MS);
        const { ruleCreateWizard } = pageObjects;
        const index = sourceIndexName(scoutSpace.id);

        await openEsqlWizard(page, kbnUrl, scoutSpace.id, ruleCreateWizard);
        await ruleCreateWizard.setEsqlQuery(
          `from ${index} metadata _id, _version, _index | not_existing_operator`
        );

        await ruleCreateWizard.continueFromDefineStepUntilQueryError('Error validating ES|QL');
        await expect(ruleCreateWizard.aboutRuleName).toBeHidden();
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
        await ruleCreateWizard.continueFromDefineStep();

        await ruleCreateWizard.aboutRuleName.fill(RULE_NAME);
        await ruleCreateWizard.aboutRuleDescription.fill(RULE_DESCRIPTION);
        await ruleCreateWizard.continueFromAboutStep();
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
        await ruleCreateWizard.continueFromDefineStep();

        await ruleCreateWizard.aboutRuleName.fill(RULE_NAME);
        await ruleCreateWizard.aboutRuleDescription.fill(RULE_DESCRIPTION);
        await ruleCreateWizard.expandAdvancedSettings();
        await ruleCreateWizard.setInvestigationFields(
          [INVESTIGATION_FIELD],
          FIELD_OPTIONS_TIMEOUT_MS
        );
        await ruleCreateWizard.continueFromAboutStep();
        await ruleCreateWizard.scheduleContinue.click();
        await ruleCreateWizard.createWithoutEnablingRule();

        await expect(ruleDetailsPage.investigationFieldValues).toHaveText(INVESTIGATION_FIELD);
      }
    );
  }
);
