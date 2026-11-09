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
  FLYOUT_VALIDATION_ROLE,
} from '../fixtures/flyout_validation_role';

/**
 * Migrated from the Cypress suite `flyout_validation.cy.ts`.
 *
 * The exception builder keeps its rows in React state and keys a row by its position when the
 * row has no id. Removing or adding a row is therefore where values can leak into the wrong
 * row. These tests drive the builder inside the real "Add rule exception" flyout and check
 * that every row keeps its own field after rows are removed, together with the validation
 * that enables the confirm button.
 *
 * Not migrated, with the reason:
 * - "Warns users about mapping conflicts": covered by the `BuilderEntryItem` unit test
 *   "it render mapping issues warning text when field has mapping conflicts".
 * - "flyout errors" (version conflict, deleted list): they target the edit flyout, and the
 *   version conflict element they assert on no longer exists in the app.
 */
spaceTest.describe('Exceptions flyout builder', { tag: tags.stateful.classic }, () => {
  let sourceIndex: string;
  let ruleId: string;

  spaceTest.beforeAll(async ({ esClient, apiServices, scoutSpace }) => {
    const idSegment = scoutSpace.id.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    sourceIndex = `${FLYOUT_VALIDATION_INDEX_PREFIX}-${idSegment}`;

    // The Cypress version loaded the shared `exceptions` archive, whose mapping lacks several
    // fields the tests type (agent.type, user.id, the nested process.elf.sections). The
    // index is created here so the fields every test relies on are explicit.
    await esClient.indices.delete({ index: sourceIndex, ignore_unavailable: true });
    await esClient.indices.create({
      index: sourceIndex,
      mappings: {
        properties: {
          '@timestamp': { type: 'date' },
          agent: {
            properties: {
              name: { type: 'keyword' },
              type: { type: 'keyword' },
            },
          },
          unique_value: { properties: { test: { type: 'keyword' } } },
          user: {
            properties: {
              id: { type: 'keyword' },
              first: { type: 'keyword' },
              last: { type: 'keyword' },
            },
          },
          process: {
            properties: {
              elf: {
                properties: {
                  sections: {
                    type: 'nested',
                    properties: {
                      name: { type: 'keyword' },
                      address: { type: 'keyword' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    await esClient.bulk({
      refresh: 'wait_for',
      operations: ['endpoint', 'filebeat'].flatMap((agentType) => [
        { index: { _index: sourceIndex } },
        {
          '@timestamp': new Date().toISOString(),
          agent: { name: `${agentType}-host`, type: agentType },
          unique_value: { test: 'test field' },
          user: { id: 'user-1', first: 'john', last: 'doe' },
          process: { elf: { sections: [{ name: '.text', address: '0x1000' }] } },
        },
      ]),
    });

    // The rule never runs and never gets exceptions. The exceptions tab therefore shows the
    // empty prompt that opens the flyout.
    ({ id: ruleId } = await apiServices.detectionRule.createCustomQueryRule({
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
    }));
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects, kbnUrl, scoutSpace }) => {
    const { ruleDetailsPage, addExceptionFlyoutPage } = pageObjects;

    await browserAuth.loginWithCustomRole(FLYOUT_VALIDATION_ROLE);
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

  spaceTest(
    'enables the confirm button only while every condition has a value',
    async ({ pageObjects }) => {
      const { addExceptionFlyoutPage: flyout } = pageObjects;

      await spaceTest.step('a field and a value enable the button', async () => {
        await flyout.setExceptionName('My item name');
        await flyout.selectField(0, 0, 'agent.name');
        await flyout.setMatchValue(0, 0, 'test');
        await expect(flyout.submitButton).toBeEnabled();
      });

      await spaceTest.step('removing the value disables the button', async () => {
        await flyout.removeMatchValue(0, 0);
        await expect(flyout.submitButton).toBeDisabled();
      });

      await spaceTest.step('switching to "is one of" keeps it disabled', async () => {
        await flyout.setOperator(0, 0, 'is one of');
        await expect(flyout.submitButton).toBeDisabled();
      });

      await spaceTest.step('adding a value enables the button again', async () => {
        await flyout.setMatchAnyValues(0, 0, ['test']);
        await expect(flyout.submitButton).toBeEnabled();
      });
    }
  );

  spaceTest('accepts a custom field that is not in the index', async ({ pageObjects }) => {
    const { addExceptionFlyoutPage: flyout } = pageObjects;

    await flyout.setExceptionName('My item name');
    await flyout.createCustomField(0, 0, 'blooberty');
    await flyout.setMatchValue(0, 0, 'blah');
    await expect(flyout.submitButton).toBeEnabled();
  });

  spaceTest('lists the fields of the rule index', async ({ pageObjects }) => {
    const { addExceptionFlyoutPage: flyout } = pageObjects;

    // The field list loads asynchronously, so poll instead of reading the options once.
    await expect
      .poll(() => flyout.searchFieldOptions(0, 0, 'unique'))
      .toContain('unique_value.test');
  });

  spaceTest('suggests values of the selected field', async ({ pageObjects }) => {
    const { addExceptionFlyoutPage: flyout } = pageObjects;

    await flyout.setExceptionName('My item name');
    await flyout.selectField(0, 0, 'agent.type');

    // Suggestions are fetched from the server after the dropdown opens.
    await expect.poll(() => flyout.getMatchValueSuggestions(0, 0)).toContain('endpoint');
    await expect.poll(() => flyout.getMatchValueSuggestions(0, 0)).toContain('filebeat');

    await flyout.selectMatchValueSuggestion(0, 0, 'endpoint');
    await expect(flyout.submitButton).toBeEnabled();
  });

  spaceTest(
    'keeps the fields of and-ed conditions when one is removed',
    async ({ pageObjects }) => {
      const { addExceptionFlyoutPage: flyout } = pageObjects;

      await spaceTest.step('build three and-ed conditions', async () => {
        await flyout.setExceptionName('My item name');
        await flyout.selectField(0, 0, 'agent.name');
        await flyout.addException(AddExceptionButtonType.AND);
        await flyout.selectField(0, 1, '@timestamp');
        await flyout.addException(AddExceptionButtonType.AND);
        await flyout.createCustomField(0, 2, 'c');
        await expect
          .poll(() => flyout.getFieldLabels(0))
          .toStrictEqual(['agent.name', '@timestamp', 'c']);
      });

      await spaceTest.step('removing the second condition keeps the other two', async () => {
        await flyout.deleteEntry(0, 1);
        await expect.poll(() => flyout.getFieldLabels(0)).toStrictEqual(['agent.name', 'c']);
      });
    }
  );

  spaceTest(
    'keeps the fields of or-ed conditions when rows are removed',
    async ({ pageObjects }) => {
      const { addExceptionFlyoutPage: flyout } = pageObjects;

      await spaceTest.step('build two or-ed items of two and three conditions', async () => {
        await flyout.setExceptionName('My item name');
        // Item 1
        await flyout.selectField(0, 0, 'agent.name');
        await flyout.addException(AddExceptionButtonType.AND);
        await flyout.selectField(0, 1, 'user.id');
        // Item 2
        await flyout.addException(AddExceptionButtonType.OR);
        await flyout.selectField(1, 0, 'user.first');
        await flyout.addException(AddExceptionButtonType.AND);
        await flyout.selectField(1, 1, 'user.last');
        await flyout.addException(AddExceptionButtonType.AND);
        await flyout.createCustomField(1, 2, 'e');
        await expect
          .poll(() => flyout.getFieldLabels(1))
          .toStrictEqual(['user.first', 'user.last', 'e']);
      });

      await spaceTest.step('removing one condition of the second item', async () => {
        await flyout.deleteEntry(1, 1);
        await expect.poll(() => flyout.getFieldLabels(0)).toStrictEqual(['agent.name', 'user.id']);
        await expect.poll(() => flyout.getFieldLabels(1)).toStrictEqual(['user.first', 'e']);
      });

      await spaceTest.step('removing the rest of the second item removes the item', async () => {
        await flyout.deleteEntry(1, 0);
        await flyout.deleteEntry(1, 0);
        await expect.poll(() => flyout.getItemCount()).toBe(1);
        await expect.poll(() => flyout.getFieldLabels(0)).toStrictEqual(['agent.name', 'user.id']);
      });
    }
  );

  spaceTest(
    'keeps the fields around a nested condition when rows are removed',
    async ({ pageObjects }) => {
      const { addExceptionFlyoutPage: flyout } = pageObjects;

      await spaceTest.step(
        'build one plain item and one item with a nested condition',
        async () => {
          // Item 1
          await flyout.selectField(0, 0, 'agent.name');
          await flyout.addException(AddExceptionButtonType.AND);
          await flyout.createCustomField(0, 1, 'b');
          // Item 2: a plain row, a nested parent with two children, then a plain row again
          await flyout.addException(AddExceptionButtonType.OR);
          await flyout.selectField(1, 0, 'agent.name');
          await flyout.addException(AddExceptionButtonType.NESTED);
          // Choosing a nested leaf fills the parent row and the first child row ('name')
          await flyout.selectNestedParent(1, 1, 'process.elf.sections.name');
          // While nested, "and" adds one more child row
          await flyout.addException(AddExceptionButtonType.AND);
          await flyout.selectField(1, 3, 'address');
          // While nested, the nested button reads "Add non-nested" and adds a plain row
          await flyout.addException(AddExceptionButtonType.NESTED);
          await flyout.selectField(1, 4, '@timestamp');
          await expect
            .poll(() => flyout.getFieldLabels(1))
            .toStrictEqual(['agent.name', 'process.elf.sections', 'name', 'address', '@timestamp']);
        }
      );

      await spaceTest.step('removing the first nested child keeps its siblings', async () => {
        await flyout.deleteEntry(1, 2);
        await expect.poll(() => flyout.getFieldLabels(0)).toStrictEqual(['agent.name', 'b']);
        await expect
          .poll(() => flyout.getFieldLabels(1))
          .toStrictEqual(['agent.name', 'process.elf.sections', 'address', '@timestamp']);
      });

      await spaceTest.step('removing the last nested child removes the nested parent', async () => {
        await flyout.deleteEntry(1, 2);
        await expect.poll(() => flyout.getFieldLabels(0)).toStrictEqual(['agent.name', 'b']);
        await expect
          .poll(() => flyout.getFieldLabels(1))
          .toStrictEqual(['agent.name', '@timestamp']);
      });
    }
  );
});
