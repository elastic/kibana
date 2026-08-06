/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExceptionItemOutput } from '@kbn/securitysolution-exceptions-common/workflows';
import { spaceTest, expect, tags } from '../fixtures';
import { EXCEPTION_WORKFLOW_STEP_ROLE } from '../common/exception_workflow_step_role';
import { buildManualWorkflowYaml } from '../common/workflow_yaml';

const STEP_TYPE = 'security.createRuleException';
const STEP_NAME = 'create_exception';
const EXECUTION_TIMEOUT = 60_000;

spaceTest.describe(
  'security.createRuleException workflow step (UI)',
  { tag: [...tags.stateful.classic] },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.set({ 'workflows:ui:enabled': true });
    });

    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginWithCustomRole(EXCEPTION_WORKFLOW_STEP_ROLE);
    });

    spaceTest.afterEach(async ({ apiServices }) => {
      await apiServices.exceptionStep.cleanup();
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset('workflows:ui:enabled');
    });

    spaceTest(
      'authors and runs a workflow that adds a rule exception covering every non-list operator',
      async ({ pageObjects, apiServices }) => {
        spaceTest.setTimeout(120_000);
        const rule = await apiServices.exceptionStep.createQueryRule(
          'rule-all-operators',
          'All operators rule'
        );

        const yaml = buildManualWorkflowYaml('wf-rule-exception-all-operators', [
          {
            name: STEP_NAME,
            type: STEP_TYPE,
            with: {
              rule_id: rule.id,
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
        expect(output.namespace_type).toBe('single');

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

        const updatedRule = await apiServices.exceptionStep.getRule(rule.id);
        expect(updatedRule.exceptions_list).toStrictEqual(
          expect.arrayContaining([
            expect.objectContaining({ list_id: item.list_id, type: 'rule_default' }),
          ])
        );
      }
    );

    spaceTest(
      'authors and runs a workflow that adds a rule exception referencing value lists',
      async ({ pageObjects, apiServices }) => {
        spaceTest.setTimeout(120_000);
        const rule = await apiServices.exceptionStep.createQueryRule(
          'rule-value-list',
          'Value list rule'
        );
        const valueListId = 'wf-approved-scanner-ips';
        const itemId = 'wf-rule-value-list-item';
        await apiServices.exceptionStep.createValueList(valueListId, 'ip');

        try {
          const yaml = buildManualWorkflowYaml('wf-rule-exception-value-list', [
            {
              name: STEP_NAME,
              type: STEP_TYPE,
              with: {
                rule_id: rule.id,
                item_id: itemId,
                name: 'Value list exception',
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

          const updatedRule = await apiServices.exceptionStep.getRule(rule.id);
          expect(updatedRule.exceptions_list).toStrictEqual(
            expect.arrayContaining([
              expect.objectContaining({ list_id: item.list_id, type: 'rule_default' }),
            ])
          );
        } finally {
          await apiServices.exceptionStep.deleteExceptionItem(itemId, 'single');
          await apiServices.exceptionStep.deleteValueList(valueListId);
        }
      }
    );

    spaceTest(
      'is idempotent by item_id: a second run overwrites the same item in place',
      async ({ pageObjects, apiServices }) => {
        spaceTest.setTimeout(180_000);
        const rule = await apiServices.exceptionStep.createQueryRule(
          'rule-idempotent',
          'Idempotent rule'
        );
        const itemId = 'wf-rule-exception-idempotent';
        const originalWith = {
          rule_id: rule.id,
          item_id: itemId,
          name: 'Original name',
          description: 'Original description',
          entries: [{ field: 'host.name', operator: 'is', value: 'original' }],
        };

        // First run creates the item.
        await pageObjects.workflowsApp.gotoNewWorkflow();
        await pageObjects.workflowsApp.setYamlEditorValue(
          buildManualWorkflowYaml('wf-idempotent-create', [
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
          buildManualWorkflowYaml('wf-idempotent-overwrite', [
            {
              name: STEP_NAME,
              type: STEP_TYPE,
              with: {
                ...originalWith,
                overwrite: true,
                name: 'Updated name',
                entries: [{ field: 'host.name', operator: 'is', value: 'updated' }],
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

        const item = await apiServices.exceptionStep.getExceptionItemByItemId(itemId, 'single');
        expect(item.name).toBe('Updated name');
        expect(item.entries).toStrictEqual([
          { type: 'match', operator: 'included', field: 'host.name', value: 'updated' },
        ]);

        // The rule should reference exactly one rule_default list after both
        // runs — overwrite must not attach a second list to the rule.
        const updatedRule = await apiServices.exceptionStep.getRule(rule.id);
        const ruleDefaultLists = (updatedRule.exceptions_list ?? []).filter(
          (list) => list.type === 'rule_default'
        );
        expect(ruleDefaultLists).toStrictEqual([
          expect.objectContaining({ list_id: item.list_id, type: 'rule_default' }),
        ]);
      }
    );

    spaceTest(
      'shows a failed execution when the target rule does not exist',
      async ({ pageObjects }) => {
        spaceTest.setTimeout(120_000);
        await pageObjects.workflowsApp.gotoNewWorkflow();
        await pageObjects.workflowsApp.setYamlEditorValue(
          buildManualWorkflowYaml('wf-missing-rule', [
            {
              name: STEP_NAME,
              type: STEP_TYPE,
              with: {
                rule_id: 'non-existent-rule-uuid',
                name: 'Orphan exception',
                description: 'Targets a rule that is not there',
                entries: [{ field: 'host.name', operator: 'is', value: 'x' }],
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
