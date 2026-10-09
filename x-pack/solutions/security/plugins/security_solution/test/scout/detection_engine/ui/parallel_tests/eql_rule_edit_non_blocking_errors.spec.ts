/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EQL_RULE, spaceTest, tags } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';

const MISSING_FIELD_QUERY = 'any where hello.world';

// Each space gets its own source index so the missing-field case does not depend on other data.
// `endgame-*` is readable by the platform engineer role, which runs the EQL validation request.
// Indices are shared by all spaces, so this index also matches the default `endgame-*` pattern for
// other specs in this config. Do not assert that `endgame-*` matches no index.
const sourceIndexName = (spaceId: string): string =>
  `endgame-scout-eql-rule-edit-${spaceId.replace(/[^a-z0-9]/gi, '').toLowerCase()}`;

spaceTest.describe(
  'EQL rule editing with non-blocking query validation errors',
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
            process: { properties: { name: { type: 'keyword' } } },
          },
        },
      });
    });

    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsPlatformEngineer();
    });

    spaceTest.afterEach(async ({ apiServices }) => {
      await apiServices.detectionRule.deleteAll();
    });

    spaceTest.afterAll(async ({ esClient, scoutSpace }) => {
      await esClient.indices.delete({
        index: sourceIndexName(scoutSpace.id),
        ignore_unavailable: true,
      });
    });

    spaceTest(
      'saves the rule after confirming the warning when the data source does not exist',
      async ({ apiServices, pageObjects }) => {
        const { id } = await apiServices.detectionRule.createEqlRule({
          ...EQL_RULE,
          enabled: false,
          index: ['fake*'],
        });

        const { ruleEditPage } = pageObjects;
        await ruleEditPage.navigate(id);
        await expect(ruleEditPage.eqlQueryInput).toHaveValue(EQL_RULE.query);

        await ruleEditPage.save();
        await expect(ruleEditPage.saveWithWarningsModal).toBeVisible();
        await expect(ruleEditPage.saveWithWarningsModal).toContainText('EQL Query:');
        await expect(ruleEditPage.saveWithWarningsModal).toContainText('index_not_found_exception');

        await ruleEditPage.confirmSaveWithWarnings();
        await expect(ruleEditPage.saveWithWarningsModal).toBeHidden();
        await expect(ruleEditPage.ruleDetailsAboutSection).toBeVisible();
      }
    );

    spaceTest(
      'saves the rule after confirming the warning when a queried field does not exist',
      async ({ apiServices, pageObjects, scoutSpace }) => {
        const { id } = await apiServices.detectionRule.createEqlRule({
          ...EQL_RULE,
          enabled: false,
          index: [sourceIndexName(scoutSpace.id)],
          query: MISSING_FIELD_QUERY,
        });

        const { ruleEditPage } = pageObjects;
        await ruleEditPage.navigate(id);
        await expect(ruleEditPage.eqlQueryInput).toHaveValue(MISSING_FIELD_QUERY);

        await ruleEditPage.save();
        await expect(ruleEditPage.saveWithWarningsModal).toBeVisible();
        await expect(ruleEditPage.saveWithWarningsModal).toContainText('EQL Query:');
        await expect(ruleEditPage.saveWithWarningsModal).toContainText('hello.world');

        await ruleEditPage.confirmSaveWithWarnings();
        await expect(ruleEditPage.saveWithWarningsModal).toBeHidden();
        await expect(ruleEditPage.ruleDetailsAboutSection).toBeVisible();
      }
    );
  }
);
