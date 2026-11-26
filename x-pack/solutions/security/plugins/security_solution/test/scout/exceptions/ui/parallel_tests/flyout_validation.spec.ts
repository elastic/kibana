/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AddExceptionButtonType, spaceTest, tags } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';
import {
  FLYOUT_VALIDATION_INDEX_PREFIX,
  getFlyoutValidationRole,
} from '../fixtures/flyout_validation_role';

spaceTest.describe(
  'Exceptions flyout builder',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    let sourceIndex: string;
    let ruleId: string;

    spaceTest.beforeAll(async ({ esClient, apiServices, scoutSpace }) => {
      const idSegment = scoutSpace.id.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      sourceIndex = `${FLYOUT_VALIDATION_INDEX_PREFIX}-${idSegment}`;

      await esClient.indices.delete({ index: sourceIndex, ignore_unavailable: true });
      await esClient.indices.create({
        index: sourceIndex,
        mappings: {
          properties: {
            '@timestamp': { type: 'date' },
            agent: { properties: { type: { type: 'keyword' } } },
            process: {
              properties: {
                elf: {
                  properties: {
                    sections: {
                      type: 'nested',
                      properties: { name: { type: 'keyword' }, address: { type: 'keyword' } },
                    },
                  },
                },
              },
            },
            unique_value: { properties: { test: { type: 'keyword' } } },
          },
        },
      });
      await esClient.bulk({
        refresh: 'wait_for',
        operations: ['endpoint', 'filebeat'].flatMap((agentType) => [
          { index: { _index: sourceIndex } },
          {
            '@timestamp': new Date().toISOString(),
            agent: { type: agentType },
            unique_value: { test: 'test field' },
          },
        ]),
      });

      // The rule never runs and never gets exceptions. The exceptions tab therefore shows the
      // empty prompt that opens the flyout.
      const rule = await apiServices.detectionRule.createCustomQueryRule({
        index: [sourceIndex],
        enabled: false,
        name: `Exceptions flyout builder ${scoutSpace.id}`,
        description: 'Rule that hosts the exceptions flyout builder tests',
        risk_score: 1,
        rule_id: `exceptions-flyout-builder-${idSegment}`,
        severity: 'low',
        type: 'query',
        query: '*:*',
        from: 'now-6m',
      });
      ruleId = rule.id;
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects, kbnUrl, scoutSpace }) => {
      const { ruleDetailsPage, addExceptionFlyoutPage } = pageObjects;

      await browserAuth.loginWithCustomRole(getFlyoutValidationRole(scoutSpace.id));
      await ruleDetailsPage.goto({
        kbnUrl,
        spaceId: scoutSpace.id,
        ruleId,
        tab: 'rule_exceptions',
      });
      await ruleDetailsPage.addExceptionFromEmptyPromptButton.click();
      await addExceptionFlyoutPage.waitForVisible();
    });

    spaceTest.afterAll(async ({ esClient, apiServices }) => {
      await apiServices.detectionRule.deleteAll();
      await esClient.indices.delete({ index: sourceIndex, ignore_unavailable: true });
    });

    spaceTest('lists the fields of the rule index', async ({ pageObjects }) => {
      const { addExceptionFlyoutPage: flyout } = pageObjects;

      // The field list loads asynchronously, so poll instead of reading the options once.
      await expect.poll(() => flyout.searchFieldOptions('unique')).toContain('unique_value.test');
    });

    spaceTest(
      'nests the condition of a field that is mapped as nested',
      async ({ pageObjects }) => {
        const { addExceptionFlyoutPage: flyout } = pageObjects;

        await flyout.selectField('agent.type');
        await flyout.addException(AddExceptionButtonType.NESTED);
        await flyout.selectNestedLeafField('process.elf.sections.name', 1);

        await expect
          .poll(() => flyout.getConditionFields())
          .toStrictEqual(['agent.type', 'process.elf.sections', 'name']);
      }
    );

    spaceTest('suggests values of the selected field', async ({ pageObjects }) => {
      const { addExceptionFlyoutPage: flyout } = pageObjects;

      await flyout.setExceptionName('My item name');
      await flyout.selectField('agent.type');

      // Suggestions are fetched from the server after the dropdown opens.
      await expect.poll(() => flyout.getMatchValueSuggestions()).toContain('endpoint');
      await expect.poll(() => flyout.getMatchValueSuggestions()).toContain('filebeat');

      await flyout.selectMatchValueSuggestion('endpoint');
      await expect(flyout.submitButton).toBeEnabled();
    });
  }
);
