/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExceptionItemOutput } from '@kbn/securitysolution-exceptions-common/workflows';
import { spaceTest, expect, tags } from '../fixtures';
import type { NamespaceType } from '../common/exception_step_test_api';
import { EXCEPTION_WORKFLOW_STEP_ROLE } from '../common/exception_workflow_step_role';
import { buildManualWorkflowYaml } from '../common/workflow_yaml';

const STEP_TYPE = 'security.createExceptionListItem';
const STEP_NAME = 'create_list_item';
const EXECUTION_TIMEOUT = 60_000;

spaceTest.describe(
  'security.createExceptionListItem workflow step (UI)',
  { tag: [...tags.stateful.classic] },
  () => {
    const createdLists: Array<{ listId: string; namespaceType: NamespaceType }> = [];

    spaceTest.beforeAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.set({ 'workflows:ui:enabled': true });
    });

    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginWithCustomRole(EXCEPTION_WORKFLOW_STEP_ROLE);
    });

    spaceTest.afterEach(async ({ apiServices }) => {
      await apiServices.exceptionStep.cleanup();
      for (const { listId, namespaceType } of createdLists) {
        await apiServices.exceptionStep.deleteExceptionList(listId, namespaceType);
      }
      createdLists.length = 0;
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset('workflows:ui:enabled');
    });

    spaceTest(
      'authors and runs a workflow that adds an item to a shared exception list',
      async ({ pageObjects, apiServices }) => {
        spaceTest.setTimeout(120_000);
        const listId = 'wf-shared-allowlist';
        await apiServices.exceptionStep.createExceptionList(listId, 'single');
        createdLists.push({ listId, namespaceType: 'single' });

        const yaml = buildManualWorkflowYaml('wf-shared-list-item', [
          {
            name: STEP_NAME,
            type: STEP_TYPE,
            with: {
              list_id: listId,
              name: 'Allow scanner',
              description: 'Vulnerability scanner traffic',
              entries: [{ field: 'source.ip', operator: 'is', value: '10.0.0.1' }],
            },
          },
        ]);

        await pageObjects.workflowsApp.gotoNewWorkflow();
        await pageObjects.workflowsApp.setYamlEditorValue(yaml);
        await pageObjects.workflowsApp.saveWorkflow();
        await pageObjects.workflowsApp.runWorkflow();
        await pageObjects.workflowsApp.waitForExecutionStatus('completed', EXECUTION_TIMEOUT);

        const output = await pageObjects.workflowsApp.getStepResultJson<ExceptionItemOutput>(
          STEP_NAME,
          'output'
        );
        expect(output.outcome).toBe('created');
        expect(output.list_id).toBe(listId);

        const item = await apiServices.exceptionStep.getExceptionItemByItemId(
          output.item_id,
          'single'
        );
        expect(item.list_id).toBe(listId);
        expect(item.entries).toStrictEqual([
          { type: 'match', operator: 'included', field: 'source.ip', value: '10.0.0.1' },
        ]);
      }
    );

    spaceTest(
      'authors and runs a workflow that adds an item to a space-agnostic list',
      async ({ pageObjects, apiServices }) => {
        spaceTest.setTimeout(120_000);
        const listId = 'wf-agnostic-allowlist';
        await apiServices.exceptionStep.createExceptionList(listId, 'agnostic');
        createdLists.push({ listId, namespaceType: 'agnostic' });

        const yaml = buildManualWorkflowYaml('wf-agnostic-list-item', [
          {
            name: STEP_NAME,
            type: STEP_TYPE,
            with: {
              list_id: listId,
              namespace_type: 'agnostic',
              name: 'Agnostic allow',
              description: 'Applies across spaces',
              entries: [{ field: 'user.name', operator: 'is_one_of', values: ['svc-a', 'svc-b'] }],
            },
          },
        ]);

        await pageObjects.workflowsApp.gotoNewWorkflow();
        await pageObjects.workflowsApp.setYamlEditorValue(yaml);
        await pageObjects.workflowsApp.saveWorkflow();
        await pageObjects.workflowsApp.runWorkflow();
        await pageObjects.workflowsApp.waitForExecutionStatus('completed', EXECUTION_TIMEOUT);

        const output = await pageObjects.workflowsApp.getStepResultJson<ExceptionItemOutput>(
          STEP_NAME,
          'output'
        );
        expect(output.outcome).toBe('created');
        expect(output.namespace_type).toBe('agnostic');

        const item = await apiServices.exceptionStep.getExceptionItemByItemId(
          output.item_id,
          'agnostic'
        );
        expect(item.entries).toStrictEqual([
          {
            type: 'match_any',
            operator: 'included',
            field: 'user.name',
            value: ['svc-a', 'svc-b'],
          },
        ]);
      }
    );

    spaceTest(
      'authors and runs a workflow that adds a list item covering every non-list operator',
      async ({ pageObjects, apiServices }) => {
        spaceTest.setTimeout(120_000);
        const listId = 'wf-all-operators-list';
        await apiServices.exceptionStep.createExceptionList(listId, 'single');
        createdLists.push({ listId, namespaceType: 'single' });

        const yaml = buildManualWorkflowYaml('wf-list-item-all-operators', [
          {
            name: STEP_NAME,
            type: STEP_TYPE,
            with: {
              list_id: listId,
              name: 'Every operator',
              description: 'One item exercising each non-list operator',
              entries: [
                { field: 'host.name', operator: 'is', value: 'excluded-host' },
                { field: 'host.name', operator: 'is_not', value: 'kept-host' },
                { field: 'user.name', operator: 'is_one_of', values: ['svc-a', 'svc-b'] },
                { field: 'user.name', operator: 'is_not_one_of', values: ['admin'] },
                { field: 'process.name', operator: 'matches', value: 'malware*' },
                { field: 'process.name', operator: 'does_not_match', value: 'trusted*' },
                { field: 'event.action', operator: 'exists' },
                { field: 'event.outcome', operator: 'does_not_exist' },
              ],
            },
          },
        ]);

        await pageObjects.workflowsApp.gotoNewWorkflow();
        await pageObjects.workflowsApp.setYamlEditorValue(yaml);
        await pageObjects.workflowsApp.saveWorkflow();
        await pageObjects.workflowsApp.runWorkflow();
        await pageObjects.workflowsApp.waitForExecutionStatus('completed', EXECUTION_TIMEOUT);

        const output = await pageObjects.workflowsApp.getStepResultJson<ExceptionItemOutput>(
          STEP_NAME,
          'output'
        );
        expect(output.outcome).toBe('created');

        const item = await apiServices.exceptionStep.getExceptionItemByItemId(
          output.item_id,
          'single'
        );
        expect(item.entries).toStrictEqual([
          { type: 'match', operator: 'included', field: 'host.name', value: 'excluded-host' },
          { type: 'match', operator: 'excluded', field: 'host.name', value: 'kept-host' },
          {
            type: 'match_any',
            operator: 'included',
            field: 'user.name',
            value: ['svc-a', 'svc-b'],
          },
          { type: 'match_any', operator: 'excluded', field: 'user.name', value: ['admin'] },
          { type: 'wildcard', operator: 'included', field: 'process.name', value: 'malware*' },
          { type: 'wildcard', operator: 'excluded', field: 'process.name', value: 'trusted*' },
          { type: 'exists', operator: 'included', field: 'event.action' },
          { type: 'exists', operator: 'excluded', field: 'event.outcome' },
        ]);
      }
    );

    spaceTest(
      'authors and runs a workflow that adds a list item referencing value lists',
      async ({ pageObjects, apiServices }) => {
        spaceTest.setTimeout(120_000);
        const listId = 'wf-value-list-target';
        await apiServices.exceptionStep.createExceptionList(listId, 'single');
        createdLists.push({ listId, namespaceType: 'single' });
        const valueListId = 'wf-approved-scanner-ips-item';
        const itemId = 'wf-list-item-value-list-item';
        await apiServices.exceptionStep.createValueList(valueListId, 'ip');

        try {
          const yaml = buildManualWorkflowYaml('wf-list-item-value-list', [
            {
              name: STEP_NAME,
              type: STEP_TYPE,
              with: {
                list_id: listId,
                item_id: itemId,
                name: 'Value list item',
                description: 'References a value list both ways',
                entries: [
                  {
                    field: 'source.ip',
                    operator: 'is_in_list',
                    list: { id: valueListId, type: 'ip' },
                  },
                  {
                    field: 'destination.ip',
                    operator: 'is_not_in_list',
                    list: { id: valueListId, type: 'ip' },
                  },
                ],
              },
            },
          ]);

          await pageObjects.workflowsApp.gotoNewWorkflow();
          await pageObjects.workflowsApp.setYamlEditorValue(yaml);
          await pageObjects.workflowsApp.saveWorkflow();
          await pageObjects.workflowsApp.runWorkflow();
          await pageObjects.workflowsApp.waitForExecutionStatus('completed', EXECUTION_TIMEOUT);

          const output = await pageObjects.workflowsApp.getStepResultJson<ExceptionItemOutput>(
            STEP_NAME,
            'output'
          );
          expect(output.outcome).toBe('created');

          const item = await apiServices.exceptionStep.getExceptionItemByItemId(
            output.item_id,
            'single'
          );
          expect(item.entries).toStrictEqual([
            {
              type: 'list',
              operator: 'included',
              field: 'source.ip',
              list: { id: valueListId, type: 'ip' },
            },
            {
              type: 'list',
              operator: 'excluded',
              field: 'destination.ip',
              list: { id: valueListId, type: 'ip' },
            },
          ]);
        } finally {
          await apiServices.exceptionStep.deleteExceptionItem(itemId, 'single');
          await apiServices.exceptionStep.deleteValueList(valueListId);
        }
      }
    );

    spaceTest(
      'is idempotent by item_id: a second run skips and leaves the item unchanged',
      async ({ pageObjects, apiServices }) => {
        spaceTest.setTimeout(180_000);
        const listId = 'wf-idempotent-list';
        await apiServices.exceptionStep.createExceptionList(listId, 'single');
        createdLists.push({ listId, namespaceType: 'single' });

        const itemId = 'wf-list-item-idempotent';
        const stepWith = {
          list_id: listId,
          item_id: itemId,
          name: 'Original name',
          description: 'Original description',
          entries: [{ field: 'source.ip', operator: 'is', value: '10.0.0.1' }],
        };

        // First run creates the item.
        await pageObjects.workflowsApp.gotoNewWorkflow();
        await pageObjects.workflowsApp.setYamlEditorValue(
          buildManualWorkflowYaml('wf-list-create', [
            { name: STEP_NAME, type: STEP_TYPE, with: stepWith },
          ])
        );
        await pageObjects.workflowsApp.saveWorkflow();
        await pageObjects.workflowsApp.runWorkflow();
        await pageObjects.workflowsApp.waitForExecutionStatus('completed', EXECUTION_TIMEOUT);
        const created = await pageObjects.workflowsApp.getStepResultJson<ExceptionItemOutput>(
          STEP_NAME,
          'output'
        );
        expect(created.outcome).toBe('created');

        // Second run with the same item_id and no overwrite skips.
        await pageObjects.workflowsApp.gotoNewWorkflow();
        await pageObjects.workflowsApp.setYamlEditorValue(
          buildManualWorkflowYaml('wf-list-skip', [
            { name: STEP_NAME, type: STEP_TYPE, with: stepWith },
          ])
        );
        await pageObjects.workflowsApp.saveWorkflow();
        await pageObjects.workflowsApp.runWorkflow();
        await pageObjects.workflowsApp.waitForExecutionStatus('completed', EXECUTION_TIMEOUT);
        const skipped = await pageObjects.workflowsApp.getStepResultJson<ExceptionItemOutput>(
          STEP_NAME,
          'output'
        );
        expect(skipped.outcome).toBe('skipped');
        expect(skipped.id).toBe(created.id);

        // Exactly one item exists for the reused item_id (no duplicate).
        const items = await apiServices.exceptionStep.findItemsInList(listId, 'single');
        expect(items).toHaveLength(1);
        expect(items[0].name).toBe('Original name');
      }
    );

    spaceTest(
      'is idempotent by item_id: a second run with overwrite updates the item in place',
      async ({ pageObjects, apiServices }) => {
        spaceTest.setTimeout(180_000);
        const listId = 'wf-idempotent-overwrite-list';
        await apiServices.exceptionStep.createExceptionList(listId, 'single');
        createdLists.push({ listId, namespaceType: 'single' });

        const itemId = 'wf-list-item-idempotent-overwrite';
        const originalWith = {
          list_id: listId,
          item_id: itemId,
          name: 'Original name',
          description: 'Original description',
          entries: [{ field: 'source.ip', operator: 'is', value: '10.0.0.1' }],
        };

        // First run creates the item.
        await pageObjects.workflowsApp.gotoNewWorkflow();
        await pageObjects.workflowsApp.setYamlEditorValue(
          buildManualWorkflowYaml('wf-list-overwrite-create', [
            { name: STEP_NAME, type: STEP_TYPE, with: originalWith },
          ])
        );
        await pageObjects.workflowsApp.saveWorkflow();
        await pageObjects.workflowsApp.runWorkflow();
        await pageObjects.workflowsApp.waitForExecutionStatus('completed', EXECUTION_TIMEOUT);
        const created = await pageObjects.workflowsApp.getStepResultJson<ExceptionItemOutput>(
          STEP_NAME,
          'output'
        );
        expect(created.outcome).toBe('created');

        // Second run with overwrite updates the existing item (same id).
        await pageObjects.workflowsApp.gotoNewWorkflow();
        await pageObjects.workflowsApp.setYamlEditorValue(
          buildManualWorkflowYaml('wf-list-overwrite-update', [
            {
              name: STEP_NAME,
              type: STEP_TYPE,
              with: {
                ...originalWith,
                overwrite: true,
                name: 'Updated name',
                entries: [{ field: 'source.ip', operator: 'is', value: '10.0.0.2' }],
              },
            },
          ])
        );
        await pageObjects.workflowsApp.saveWorkflow();
        await pageObjects.workflowsApp.runWorkflow();
        await pageObjects.workflowsApp.waitForExecutionStatus('completed', EXECUTION_TIMEOUT);
        const overwritten = await pageObjects.workflowsApp.getStepResultJson<ExceptionItemOutput>(
          STEP_NAME,
          'output'
        );
        expect(overwritten.outcome).toBe('overwritten');
        expect(overwritten.id).toBe(created.id);

        // Exactly one item exists for the reused item_id (no duplicate).
        const items = await apiServices.exceptionStep.findItemsInList(listId, 'single');
        expect(items).toHaveLength(1);
        expect(items[0].name).toBe('Updated name');
        expect(items[0].entries).toStrictEqual([
          { type: 'match', operator: 'included', field: 'source.ip', value: '10.0.0.2' },
        ]);
      }
    );

    spaceTest(
      'fails without skipping, overwriting, or creating when item_id belongs to a different list',
      async ({ pageObjects, apiServices }) => {
        spaceTest.setTimeout(120_000);
        const ownListId = 'wf-conflict-own-list';
        const foreignListId = 'wf-conflict-foreign-list';
        await apiServices.exceptionStep.createExceptionList(ownListId, 'single');
        await apiServices.exceptionStep.createExceptionList(foreignListId, 'single');
        createdLists.push({ listId: ownListId, namespaceType: 'single' });
        createdLists.push({ listId: foreignListId, namespaceType: 'single' });

        const itemId = 'wf-conflict-item-id';
        await apiServices.exceptionStep.createExceptionListItem(
          foreignListId,
          'single',
          itemId,
          'Foreign item'
        );

        await pageObjects.workflowsApp.gotoNewWorkflow();
        await pageObjects.workflowsApp.setYamlEditorValue(
          buildManualWorkflowYaml('wf-list-item-conflict', [
            {
              name: STEP_NAME,
              type: STEP_TYPE,
              with: {
                list_id: ownListId,
                item_id: itemId,
                name: 'Should not be created',
                description: 'item_id already belongs to a different list',
                entries: [{ field: 'source.ip', operator: 'is', value: '10.0.0.1' }],
              },
            },
          ])
        );
        await pageObjects.workflowsApp.saveWorkflow();
        await pageObjects.workflowsApp.runWorkflow();
        await pageObjects.workflowsApp.waitForExecutionStatus('failed', EXECUTION_TIMEOUT);

        // The foreign item is untouched, and nothing was created on the own list.
        const foreignItem = await apiServices.exceptionStep.getExceptionItemByItemId(
          itemId,
          'single'
        );
        expect(foreignItem.list_id).toBe(foreignListId);
        expect(foreignItem.name).toBe('Foreign item');

        const ownListItems = await apiServices.exceptionStep.findItemsInList(ownListId, 'single');
        expect(ownListItems).toHaveLength(0);
      }
    );

    spaceTest(
      'shows a failed execution when the target list does not exist',
      async ({ pageObjects }) => {
        spaceTest.setTimeout(120_000);
        await pageObjects.workflowsApp.gotoNewWorkflow();
        await pageObjects.workflowsApp.setYamlEditorValue(
          buildManualWorkflowYaml('wf-missing-list', [
            {
              name: STEP_NAME,
              type: STEP_TYPE,
              with: {
                list_id: 'this-list-does-not-exist',
                name: 'Orphan item',
                description: 'Targets a list that is not there',
                entries: [{ field: 'source.ip', operator: 'is', value: '10.0.0.1' }],
              },
            },
          ])
        );
        await pageObjects.workflowsApp.saveWorkflow();
        await pageObjects.workflowsApp.runWorkflow();
        await pageObjects.workflowsApp.waitForExecutionStatus('failed', EXECUTION_TIMEOUT);
      }
    );
  }
);
