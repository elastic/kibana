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
  getEsqlRuleQuery,
  getEsqlStatsQuery,
} from '../fixtures/esql_rule';

const NAME_OVERRIDE_FROM_NEW_COLUMN = 'event.category';
const NAME_OVERRIDE_FROM_EXISTING_COLUMN = 'test_id';

spaceTest.describe(
  'ES|QL rule editing',
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
      'edits the query of an ES|QL rule and shows it on the details page',
      async ({ apiServices, pageObjects, scoutSpace }) => {
        const { esqlRuleForm, ruleEditPage, ruleDetailsPage } = pageObjects;
        const index = esqlSourceIndexName(scoutSpace.id);
        const originalQuery = getEsqlRuleQuery(index);
        const editedQuery = getEsqlStatsQuery(index);
        const { id } = await apiServices.detectionRule.createEsqlRule({
          ...ESQL_RULE,
          enabled: false,
          query: originalQuery,
        });

        await ruleEditPage.navigate(id);
        await expect.poll(() => esqlRuleForm.esqlEditor.getQuery()).toBe(originalQuery);

        await esqlRuleForm.setQuery(editedQuery);
        await ruleEditPage.save();

        await expect(ruleEditPage.ruleDetailsAboutSection).toBeVisible();
        await expect(
          ruleDetailsPage.detailValue(ruleDetailsPage.definitionSection, 'ES|QL query')
        ).toHaveText(editedQuery);
      }
    );

    spaceTest(
      'edits the query and overrides the rule name with a column of the new query',
      async ({ apiServices, pageObjects, scoutSpace }) => {
        const { esqlRuleForm, ruleCreateWizard, ruleEditPage, ruleDetailsPage } = pageObjects;
        const index = esqlSourceIndexName(scoutSpace.id);
        const { id } = await apiServices.detectionRule.createEsqlRule({
          ...ESQL_RULE,
          enabled: false,
          query: getEsqlRuleQuery(index),
        });

        await ruleEditPage.navigate(id);
        await esqlRuleForm.setQuery(getEsqlStatsQuery(index));

        await ruleCreateWizard.editAboutTab.click();
        await ruleCreateWizard.expandAdvancedSettings();
        await esqlRuleForm.selectRuleNameOverride(NAME_OVERRIDE_FROM_NEW_COLUMN);
        await ruleEditPage.save();

        await expect(ruleEditPage.ruleDetailsAboutSection).toBeVisible();
        await expect(
          ruleDetailsPage.detailValue(ruleDetailsPage.aboutSection, 'Rule name override')
        ).toHaveText(NAME_OVERRIDE_FROM_NEW_COLUMN);
      }
    );

    spaceTest(
      'adds a rule name override to an existing ES|QL rule',
      async ({ apiServices, pageObjects, scoutSpace }) => {
        const { esqlRuleForm, ruleCreateWizard, ruleEditPage, ruleDetailsPage } = pageObjects;
        const query = getEsqlRuleQuery(esqlSourceIndexName(scoutSpace.id));
        const { id } = await apiServices.detectionRule.createEsqlRule({
          ...ESQL_RULE,
          enabled: false,
          query,
        });

        await ruleEditPage.navigate(id);
        await expect.poll(() => esqlRuleForm.esqlEditor.getQuery()).toBe(query);

        await ruleCreateWizard.editAboutTab.click();
        await ruleCreateWizard.expandAdvancedSettings();
        await esqlRuleForm.selectRuleNameOverride(NAME_OVERRIDE_FROM_EXISTING_COLUMN);
        await ruleEditPage.save();

        await expect(ruleEditPage.ruleDetailsAboutSection).toBeVisible();
        await expect(
          ruleDetailsPage.detailValue(ruleDetailsPage.aboutSection, 'Rule name override')
        ).toHaveText(NAME_OVERRIDE_FROM_EXISTING_COLUMN);
      }
    );

    spaceTest(
      'saves the rule after confirming the warning when the data source does not exist',
      async ({ apiServices, pageObjects }) => {
        const { ruleEditPage } = pageObjects;
        const { id } = await apiServices.detectionRule.createEsqlRule({
          ...ESQL_RULE,
          enabled: false,
          query: 'from fake-* metadata _id, _version, _index | keep agent.*,_id | eval test_id=_id',
        });

        await ruleEditPage.navigate(id);
        await ruleEditPage.save();
        await expect(ruleEditPage.saveWithWarningsModal).toBeVisible();

        await ruleEditPage.confirmSaveWithWarnings();
        await expect(ruleEditPage.saveWithWarningsModal).toBeHidden();
        await expect(ruleEditPage.ruleDetailsAboutSection).toBeVisible();
      }
    );

    spaceTest(
      'saves the rule after confirming the warning when a queried field does not exist',
      async ({ apiServices, pageObjects, scoutSpace }) => {
        const { ruleEditPage } = pageObjects;
        const { id } = await apiServices.detectionRule.createEsqlRule({
          ...ESQL_RULE,
          enabled: false,
          query: `from ${esqlSourceIndexName(
            scoutSpace.id
          )} metadata _id, _version, _index | keep hello.world`,
        });

        await ruleEditPage.navigate(id);
        await ruleEditPage.save();
        await expect(ruleEditPage.saveWithWarningsModal).toBeVisible();

        await ruleEditPage.confirmSaveWithWarnings();
        await expect(ruleEditPage.saveWithWarningsModal).toBeHidden();
        await expect(ruleEditPage.ruleDetailsAboutSection).toBeVisible();
      }
    );
  }
);
