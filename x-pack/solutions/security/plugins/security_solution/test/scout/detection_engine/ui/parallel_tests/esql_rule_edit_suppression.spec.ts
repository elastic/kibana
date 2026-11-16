/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ESQL_RULE, spaceTest, tags } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';
import {
  createEsqlSourceIndex,
  deleteEsqlSourceIndex,
  esqlSourceIndexName,
  getEsqlStatsQuery,
} from '../fixtures/esql_rule';

const SUPPRESS_BY_FIELD = 'event.category';
const ADDED_SUPPRESS_BY_FIELD = '_count';

spaceTest.describe(
  'ES|QL rule editing: alert suppression',
  {
    tag: [...tags.stateful.classic, ...tags.serverless.security.complete],
  },
  () => {
    spaceTest.beforeAll(async ({ esClient, scoutSpace }) => {
      await createEsqlSourceIndex(esClient, esqlSourceIndexName(scoutSpace.id));
    });

    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsPlatformEngineer();
    });

    spaceTest.afterEach(async ({ apiServices }) => {
      await apiServices.detectionRule.deleteAll();
    });

    spaceTest.afterAll(async ({ esClient, scoutSpace }) => {
      await deleteEsqlSourceIndex(esClient, esqlSourceIndexName(scoutSpace.id));
    });

    spaceTest(
      'shows the saved suppression options and allows editing them',
      async ({ apiServices, pageObjects, scoutSpace }) => {
        const { esqlRuleForm, ruleEditPage, ruleDetailsPage } = pageObjects;
        const { id } = await apiServices.detectionRule.createEsqlRule({
          ...ESQL_RULE,
          enabled: false,
          query: getEsqlStatsQuery(esqlSourceIndexName(scoutSpace.id)),
          alert_suppression: {
            group_by: [SUPPRESS_BY_FIELD],
            duration: { value: 3, unit: 'h' },
            missing_fields_strategy: 'suppress',
          },
        });

        await ruleEditPage.navigate(id);

        await spaceTest.step('the form shows the saved suppression settings', async () => {
          await expect(esqlRuleForm.suppressionDurationValue).toBeEnabled();
          await expect(esqlRuleForm.suppressionDurationValue).toHaveValue('3');
          await expect(esqlRuleForm.suppressionDurationUnit).toHaveValue('h');
          await expect
            .poll(() => esqlRuleForm.suppressionFields().getSelectedOptions())
            .toStrictEqual([SUPPRESS_BY_FIELD]);
          await expect(esqlRuleForm.suppressMissingFields).toBeChecked();
        });

        await spaceTest.step('edit the suppression settings and save', async () => {
          await esqlRuleForm.suppressPerRuleExecution.check();
          await esqlRuleForm.doNotSuppressMissingFields.check();
          await esqlRuleForm.selectSuppressionFields([SUPPRESS_BY_FIELD, ADDED_SUPPRESS_BY_FIELD]);
          await ruleEditPage.save();
        });

        await spaceTest.step('the details page shows the edited settings', async () => {
          const { definitionSection } = ruleDetailsPage;
          await expect(ruleEditPage.ruleDetailsAboutSection).toBeVisible();
          await expect(
            ruleDetailsPage.detailValue(definitionSection, 'Suppress alerts by')
          ).toHaveText(`${SUPPRESS_BY_FIELD}${ADDED_SUPPRESS_BY_FIELD}`);
          await expect(
            ruleDetailsPage.detailValue(definitionSection, 'Suppress alerts for')
          ).toHaveText('One rule execution');
          await expect(
            ruleDetailsPage.detailValue(definitionSection, 'If a suppression field is missing')
          ).toHaveText('Do not suppress alerts for events with missing fields');
        });
      }
    );

    spaceTest(
      'enables suppression on a rule that has none',
      async ({ apiServices, pageObjects, scoutSpace }) => {
        const { esqlRuleForm, ruleEditPage, ruleDetailsPage } = pageObjects;
        const { id } = await apiServices.detectionRule.createEsqlRule({
          ...ESQL_RULE,
          enabled: false,
          query: getEsqlStatsQuery(esqlSourceIndexName(scoutSpace.id)),
        });

        await ruleEditPage.navigate(id);
        await esqlRuleForm.selectSuppressionFields([SUPPRESS_BY_FIELD]);
        await ruleEditPage.save();

        const { definitionSection } = ruleDetailsPage;
        await expect(ruleEditPage.ruleDetailsAboutSection).toBeVisible();
        await expect(
          ruleDetailsPage.detailValue(definitionSection, 'Suppress alerts by')
        ).toHaveText(SUPPRESS_BY_FIELD);
        await expect(
          ruleDetailsPage.detailValue(definitionSection, 'Suppress alerts for')
        ).toHaveText('One rule execution');
        await expect(
          ruleDetailsPage.detailValue(definitionSection, 'If a suppression field is missing')
        ).toHaveText('Suppress and group alerts for events with missing fields');
      }
    );
  }
);
