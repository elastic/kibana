/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import {
  BulkActionEditTypeEnum,
  type BulkActionEditPayload,
} from '../../../common/api/detection_engine/rule_management';
import { convertRuleSearchTermToKQL } from '../../../common/detection_engine/rule_management/rule_filtering';
import type { DetectionRulesAuthz } from '../../../common/detection_engine/rule_management/authz';
import type { PrebuiltRulesCustomizationStatus } from '../../../common/detection_engine/prebuilt_rules/prebuilt_rule_customization_status';
import type { MlAuthz } from '../../lib/machine_learning/authz';
import type { RuleAlertType } from '../../lib/detection_engine/rule_schema';
import type { IPrebuiltRuleAssetsClient } from '../../lib/detection_engine/prebuilt_rules/logic/rule_assets/prebuilt_rule_assets_client';
import type { bulkEditRules } from '../../lib/detection_engine/rule_management/logic/bulk_actions/bulk_edit_rules';
import {
  createAlertAnalysisWorkflowRuleAttachmentService,
  hasAlertAnalysisWorkflowAction,
} from './rule_attachments';
import {
  createConnectorAction,
  createRule,
  createWorkflowAction as createWorkflowActionFixture,
  createWorkflowSystemAction as createWorkflowSystemActionFixture,
} from './test_fixtures';

const WORKFLOW_ID = 'system-security-alert-analysis-default';

const createWorkflowAction = (workflowId = WORKFLOW_ID) => createWorkflowActionFixture(workflowId);

const createWorkflowSystemAction = (workflowId = WORKFLOW_ID) =>
  createWorkflowSystemActionFixture(workflowId);

const createRulesClient = (rules: RuleAlertType[]): jest.Mocked<RulesClient> =>
  ({
    find: jest.fn().mockResolvedValue({
      data: rules,
      total: rules.length,
      page: 1,
      perPage: 2000,
    }),
  } as Partial<jest.Mocked<RulesClient>> as jest.Mocked<RulesClient>);

const createBulkEditDependencies = () => ({
  actionsClient: {} as ActionsClient,
  prebuiltRuleAssetClient: {} as IPrebuiltRuleAssetsClient,
  mlAuthz: {} as MlAuthz,
  rulesAuthz: {} as DetectionRulesAuthz,
  ruleCustomizationStatus: {} as PrebuiltRulesCustomizationStatus,
});

describe('alert analysis workflow rule attachments', () => {
  it('detects the exact workflow action on a rule', () => {
    expect(
      hasAlertAnalysisWorkflowAction(
        createRule({ id: 'rule-1', actions: [createWorkflowAction()] }),
        WORKFLOW_ID
      )
    ).toBe(true);
    expect(
      hasAlertAnalysisWorkflowAction(
        createRule({ id: 'rule-1', actions: [createWorkflowAction('other-workflow')] }),
        WORKFLOW_ID
      )
    ).toBe(false);
  });

  it('detects the workflow action when stored as a system action', () => {
    expect(
      hasAlertAnalysisWorkflowAction(
        createRule({ id: 'rule-1', systemActions: [createWorkflowSystemAction()] }),
        WORKFLOW_ID
      )
    ).toBe(true);
  });

  it('returns total and attached counts for matching rules', async () => {
    const rulesClient = createRulesClient([
      createRule({ id: 'rule-1', actions: [createWorkflowAction()] }),
      createRule({ id: 'rule-2' }),
    ]);
    const service = createAlertAnalysisWorkflowRuleAttachmentService({
      rulesClient,
      workflowId: WORKFLOW_ID,
    });

    await expect(
      service.getRuleAttachmentStats({ search: '', attachmentFilter: 'all' })
    ).resolves.toEqual({
      total: 2,
      attached: 1,
    });
    expect(rulesClient.find).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          fields: undefined,
        }),
      })
    );
  });

  it('returns paginated rule attachment summaries', async () => {
    const rulesClient = createRulesClient([
      createRule({ id: 'rule-3' }),
      createRule({ id: 'rule-2', enabled: false }),
      createRule({ id: 'rule-1', actions: [createWorkflowAction()] }),
    ]);
    const service = createAlertAnalysisWorkflowRuleAttachmentService({
      rulesClient,
      workflowId: WORKFLOW_ID,
    });

    await expect(
      service.getRuleAttachments({ search: '', attachmentFilter: 'all', page: 2, perPage: 1 })
    ).resolves.toEqual({
      total: 3,
      attached: 1,
      page: 2,
      perPage: 1,
      rules: [
        {
          id: 'rule-3',
          name: 'Rule rule-3',
          enabled: true,
          attached: false,
        },
      ],
    });
  });

  it('sorts rules deterministically by enabled state, name, and id before paginating', async () => {
    const rulesClient = createRulesClient([
      createRule({ id: 'rule-3', enabled: false }),
      createRule({ id: 'rule-2' }),
      createRule({ id: 'rule-1' }),
    ]);
    const service = createAlertAnalysisWorkflowRuleAttachmentService({
      rulesClient,
      workflowId: WORKFLOW_ID,
    });

    await expect(
      service.getRuleAttachments({ search: '', attachmentFilter: 'all', page: 1, perPage: 3 })
    ).resolves.toEqual(
      expect.objectContaining({
        rules: [
          expect.objectContaining({ id: 'rule-1' }),
          expect.objectContaining({ id: 'rule-2' }),
          expect.objectContaining({ id: 'rule-3' }),
        ],
      })
    );
  });

  it('returns selectable rule ids for all matching rules missing the workflow action', async () => {
    const rulesClient = createRulesClient([
      createRule({ id: 'rule-1', actions: [createWorkflowAction()] }),
      createRule({ id: 'rule-2' }),
      createRule({ id: 'rule-3' }),
    ]);
    const service = createAlertAnalysisWorkflowRuleAttachmentService({
      rulesClient,
      workflowId: WORKFLOW_ID,
    });

    await expect(
      service.getRuleAttachmentSelection({ search: '', attachmentFilter: 'all' })
    ).resolves.toEqual({
      total: 3,
      attached: 1,
      selectable: 2,
      attachedRuleIds: ['rule-1'],
      ruleIds: ['rule-2', 'rule-3'],
    });
  });

  it('narrows stats, list, and selection to only attached rules when filtered', async () => {
    const buildService = () =>
      createAlertAnalysisWorkflowRuleAttachmentService({
        rulesClient: createRulesClient([
          createRule({ id: 'rule-1', actions: [createWorkflowAction()] }),
          createRule({ id: 'rule-2' }),
          createRule({ id: 'rule-3', systemActions: [createWorkflowSystemAction()] }),
        ]),
        workflowId: WORKFLOW_ID,
      });

    await expect(
      buildService().getRuleAttachmentStats({ search: '', attachmentFilter: 'attached' })
    ).resolves.toEqual({ total: 2, attached: 2 });

    await expect(
      buildService().getRuleAttachments({
        search: '',
        attachmentFilter: 'attached',
        page: 1,
        perPage: 20,
      })
    ).resolves.toEqual(
      expect.objectContaining({
        total: 2,
        attached: 2,
        rules: [
          expect.objectContaining({ id: 'rule-1', attached: true }),
          expect.objectContaining({ id: 'rule-3', attached: true }),
        ],
      })
    );

    await expect(
      buildService().getRuleAttachmentSelection({ search: '', attachmentFilter: 'attached' })
    ).resolves.toEqual({
      total: 2,
      attached: 2,
      selectable: 0,
      attachedRuleIds: ['rule-1', 'rule-3'],
      ruleIds: [],
    });
  });

  it('narrows stats, list, and selection to only rules missing the workflow when filtered', async () => {
    const buildService = () =>
      createAlertAnalysisWorkflowRuleAttachmentService({
        rulesClient: createRulesClient([
          createRule({ id: 'rule-1', actions: [createWorkflowAction()] }),
          createRule({ id: 'rule-2' }),
          createRule({ id: 'rule-3' }),
        ]),
        workflowId: WORKFLOW_ID,
      });

    await expect(
      buildService().getRuleAttachmentStats({ search: '', attachmentFilter: 'not_attached' })
    ).resolves.toEqual({ total: 2, attached: 0 });

    await expect(
      buildService().getRuleAttachmentSelection({ search: '', attachmentFilter: 'not_attached' })
    ).resolves.toEqual({
      total: 2,
      attached: 0,
      selectable: 2,
      attachedRuleIds: [],
      ruleIds: ['rule-2', 'rule-3'],
    });
  });

  it('bulk edits only selected rules that need attachment changes', async () => {
    const missingWorkflowRule = createRule({ id: 'rule-2' });
    const attachedWorkflowRule = createRule({
      id: 'rule-3',
      actions: [createConnectorAction()],
      systemActions: [createWorkflowSystemAction()],
    });
    const bulkEditRulesFn = jest.fn().mockResolvedValue({
      rules: [missingWorkflowRule],
      skipped: [],
      errors: [],
      total: 1,
    }) as jest.MockedFunction<typeof bulkEditRules>;
    const service = createAlertAnalysisWorkflowRuleAttachmentService({
      rulesClient: createRulesClient([
        createRule({ id: 'rule-1', actions: [createWorkflowAction()] }),
        missingWorkflowRule,
        attachedWorkflowRule,
      ]),
      workflowId: WORKFLOW_ID,
      bulkEditDependencies: createBulkEditDependencies(),
      bulkEditRulesFn,
    });

    bulkEditRulesFn
      .mockResolvedValueOnce({
        rules: [missingWorkflowRule],
        skipped: [],
        errors: [],
        total: 1,
      })
      .mockResolvedValueOnce({
        rules: [attachedWorkflowRule],
        skipped: [],
        errors: [],
        total: 1,
      });

    await expect(
      service.updateRuleAttachments({
        attachRuleIds: ['rule-1', 'rule-2'],
        detachRuleIds: ['rule-3'],
      })
    ).resolves.toEqual({
      matched: 3,
      updated: 2,
    });
    expect(bulkEditRulesFn).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        rules: [missingWorkflowRule],
        actions: [
          expect.objectContaining({
            type: BulkActionEditTypeEnum.add_rule_actions,
            // summaryMode: true keeps the connector calling runWorkflow once per rule
            // execution with the full alert batch. Flipping it back to false would silently
            // restore the per-alert fan-out this was fixed to avoid.
            value: {
              actions: [
                expect.objectContaining({
                  params: expect.objectContaining({
                    subActionParams: expect.objectContaining({ summaryMode: true }),
                  }),
                }),
              ],
            },
          }) as BulkActionEditPayload,
        ],
      })
    );
    expect(bulkEditRulesFn).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        rules: [attachedWorkflowRule],
        actions: [
          expect.objectContaining({
            type: BulkActionEditTypeEnum.set_rule_actions,
            value: {
              actions: [
                expect.objectContaining({
                  id: 'connector-id',
                }),
              ],
            },
          }) as BulkActionEditPayload,
        ],
      })
    );
  });

  it('does not bulk edit rules during dry run', async () => {
    const bulkEditRulesFn = jest.fn() as jest.MockedFunction<typeof bulkEditRules>;
    const service = createAlertAnalysisWorkflowRuleAttachmentService({
      rulesClient: createRulesClient([
        createRule({ id: 'rule-1', actions: [createWorkflowAction()] }),
        createRule({ id: 'rule-2' }),
      ]),
      workflowId: WORKFLOW_ID,
      bulkEditDependencies: createBulkEditDependencies(),
      bulkEditRulesFn,
    });

    await expect(
      service.updateRuleAttachments({
        attachRuleIds: ['rule-1', 'rule-2'],
        detachRuleIds: [],
        dryRun: true,
      })
    ).resolves.toEqual({
      matched: 2,
      updated: 1,
    });
    expect(bulkEditRulesFn).not.toHaveBeenCalled();
  });

  it('does not bulk edit selected rules that already have the workflow action', async () => {
    const bulkEditRulesFn = jest.fn() as jest.MockedFunction<typeof bulkEditRules>;
    const service = createAlertAnalysisWorkflowRuleAttachmentService({
      rulesClient: createRulesClient([
        createRule({ id: 'rule-1', systemActions: [createWorkflowSystemAction()] }),
      ]),
      workflowId: WORKFLOW_ID,
      bulkEditDependencies: createBulkEditDependencies(),
      bulkEditRulesFn,
    });

    await expect(
      service.updateRuleAttachments({ attachRuleIds: ['rule-1'], detachRuleIds: [] })
    ).resolves.toEqual({
      matched: 1,
      updated: 0,
    });
    expect(bulkEditRulesFn).not.toHaveBeenCalled();
  });

  it('collapses detaches that share the same remaining action list into one bulkEdit', async () => {
    // Every rule carries only the workflow action, so after detaching it they all end up with the
    // same empty action list. That is the case the UI hits when it bulk-detaches a set it just
    // bulk-attached, and it used to fire one bulkEdit per rule (which is what hung). It should now
    // collapse to a single bulkEdit for all of them.
    const ruleCount = 50;
    const rules = Array.from({ length: ruleCount }, (_, index) =>
      createRule({ id: `rule-${index}`, actions: [createWorkflowAction()] })
    );
    const bulkEditRulesFn = jest.fn().mockImplementation(async ({ rules: editedRules }) => ({
      rules: editedRules,
      skipped: [],
      errors: [],
      total: editedRules.length,
    })) as jest.MockedFunction<typeof bulkEditRules>;
    const service = createAlertAnalysisWorkflowRuleAttachmentService({
      rulesClient: createRulesClient(rules),
      workflowId: WORKFLOW_ID,
      bulkEditDependencies: createBulkEditDependencies(),
      bulkEditRulesFn,
    });

    await expect(
      service.updateRuleAttachments({
        attachRuleIds: [],
        detachRuleIds: rules.map(({ id }) => id),
      })
    ).resolves.toEqual({
      matched: ruleCount,
      updated: ruleCount,
    });
    expect(bulkEditRulesFn).toHaveBeenCalledTimes(1);
    expect(bulkEditRulesFn).toHaveBeenCalledWith(
      expect.objectContaining({ rules, actions: [expect.anything()] })
    );
  });

  it('bounds concurrent bulkEdit calls when detaching many rules with distinct action lists', async () => {
    const ruleCount = 25;
    // Give each rule a unique extra connector so its remaining action list after detach is unique,
    // forcing one bulkEdit per rule (the worst case) so the concurrency bound is exercised.
    const rules = Array.from({ length: ruleCount }, (_, index) =>
      createRule({
        id: `rule-${index}`,
        actions: [createWorkflowAction(), createConnectorAction(`connector-${index}`)],
      })
    );
    let active = 0;
    let maxActive = 0;
    const bulkEditRulesFn = jest.fn().mockImplementation(async ({ rules: editedRules }) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 1));
      active -= 1;
      return { rules: editedRules, skipped: [], errors: [], total: editedRules.length };
    }) as jest.MockedFunction<typeof bulkEditRules>;
    const service = createAlertAnalysisWorkflowRuleAttachmentService({
      rulesClient: createRulesClient(rules),
      workflowId: WORKFLOW_ID,
      bulkEditDependencies: createBulkEditDependencies(),
      bulkEditRulesFn,
    });

    await expect(
      service.updateRuleAttachments({
        attachRuleIds: [],
        detachRuleIds: rules.map(({ id }) => id),
      })
    ).resolves.toEqual({
      matched: ruleCount,
      updated: ruleCount,
    });
    expect(bulkEditRulesFn).toHaveBeenCalledTimes(ruleCount);
    expect(maxActive).toBeLessThanOrEqual(10);
  });

  it('attempts every detach even when one bulkEdit rejects, and reports the failure count', async () => {
    // Unique extra connectors keep each detach in its own bulkEdit group, so a single group's
    // rejection maps to exactly one failed rule instead of collapsing with the others.
    const rules = Array.from({ length: 5 }, (_, index) =>
      createRule({
        id: `rule-${index}`,
        actions: [createWorkflowAction(), createConnectorAction(`connector-${index}`)],
      })
    );
    // One rule's detach rejects at the transport level; the others must still be attempted
    // rather than aborted, and the failure must be surfaced.
    const bulkEditRulesFn = jest.fn().mockImplementation(async ({ rules: editedRules }) => {
      if (editedRules[0].id === 'rule-2') {
        throw new Error('transport error');
      }
      return { rules: editedRules, skipped: [], errors: [], total: editedRules.length };
    }) as jest.MockedFunction<typeof bulkEditRules>;
    const service = createAlertAnalysisWorkflowRuleAttachmentService({
      rulesClient: createRulesClient(rules),
      workflowId: WORKFLOW_ID,
      bulkEditDependencies: createBulkEditDependencies(),
      bulkEditRulesFn,
    });

    await expect(
      service.updateRuleAttachments({
        attachRuleIds: [],
        detachRuleIds: rules.map(({ id }) => id),
      })
    ).rejects.toThrow('Failed to update the alert analysis workflow on 1 rule(s)');
    // All five detaches were attempted despite the one rejection (no fail-fast abort).
    expect(bulkEditRulesFn).toHaveBeenCalledTimes(5);
  });

  it('rejects rules that are both attached and detached in the same request', async () => {
    const service = createAlertAnalysisWorkflowRuleAttachmentService({
      rulesClient: createRulesClient([createRule({ id: 'rule-1' })]),
      workflowId: WORKFLOW_ID,
      bulkEditDependencies: createBulkEditDependencies(),
    });

    await expect(
      service.updateRuleAttachments({ attachRuleIds: ['rule-1'], detachRuleIds: ['rule-1'] })
    ).rejects.toThrow('Rules cannot be both attached and detached in the same request');
  });

  it('searches rule names by substring, matching the Rules page behavior', async () => {
    const rulesClient = createRulesClient([createRule({ id: 'rule-1' })]);
    const service = createAlertAnalysisWorkflowRuleAttachmentService({
      rulesClient,
      workflowId: WORKFLOW_ID,
    });

    await service.getRuleAttachments({
      search: 'Def',
      attachmentFilter: 'all',
      page: 1,
      perPage: 20,
    });

    // A single search term must become a `name.keyword: *term*` substring filter (the same KQL
    // the Rules page uses), not a whole-word/prefix `search`. Otherwise `Def` would not match
    // `Endpoint Security (Elastic Defend)`.
    const { options } = rulesClient.find.mock.calls[0][0] as {
      options: { filter?: string; search?: string; searchFields?: string[] };
    };
    expect(options.filter).toEqual(expect.stringContaining('alert.attributes.name.keyword: *Def*'));
    expect(options.filter).toEqual(expect.stringContaining(convertRuleSearchTermToKQL('Def')));
    expect(options.search).toBeUndefined();
    expect(options.searchFields).toBeUndefined();
  });

  it('does not add a name search filter when the search term is empty', async () => {
    const rulesClient = createRulesClient([createRule({ id: 'rule-1' })]);
    const service = createAlertAnalysisWorkflowRuleAttachmentService({
      rulesClient,
      workflowId: WORKFLOW_ID,
    });

    await service.getRuleAttachments({
      search: '   ',
      attachmentFilter: 'all',
      page: 1,
      perPage: 20,
    });

    // `findRules` always enriches the filter with the rule-type mapping, so the filter is never
    // empty. What matters is that a blank search adds no `name` condition.
    const { options } = rulesClient.find.mock.calls[0][0] as { options: { filter?: string } };
    expect(options.filter ?? '').not.toContain('alert.attributes.name');
  });

  it('throws when more than the max number of rules match the search', async () => {
    const rulesClient = {
      find: jest.fn().mockResolvedValue({ data: [], total: 2001, page: 1, perPage: 2000 }),
    } as Partial<jest.Mocked<RulesClient>> as jest.Mocked<RulesClient>;
    const service = createAlertAnalysisWorkflowRuleAttachmentService({
      rulesClient,
      workflowId: WORKFLOW_ID,
    });

    await expect(
      service.getRuleAttachmentStats({ search: '', attachmentFilter: 'all' })
    ).rejects.toThrow('More than 2000 rules matched the filter query');
  });

  it('throws when more than the max number of rules are selected for update', async () => {
    const service = createAlertAnalysisWorkflowRuleAttachmentService({
      rulesClient: createRulesClient([]),
      workflowId: WORKFLOW_ID,
      bulkEditDependencies: createBulkEditDependencies(),
    });

    await expect(
      service.updateRuleAttachments({
        attachRuleIds: Array.from({ length: 2001 }, (_, index) => `rule-${index}`),
        detachRuleIds: [],
      })
    ).rejects.toThrow('More than 2000 rules were selected');
  });

  it('throws when a selected rule id cannot be resolved', async () => {
    // find resolves only rule-1 (total 1) but two ids were requested.
    const service = createAlertAnalysisWorkflowRuleAttachmentService({
      rulesClient: createRulesClient([createRule({ id: 'rule-1' })]),
      workflowId: WORKFLOW_ID,
      bulkEditDependencies: createBulkEditDependencies(),
    });

    await expect(
      service.updateRuleAttachments({
        attachRuleIds: ['rule-1', 'missing-rule'],
        detachRuleIds: [],
      })
    ).rejects.toThrow('Failed to resolve 1 selected rule(s)');
  });

  it('throws when bulk edit dependencies are missing but changes are required', async () => {
    // rule-1 lacks the workflow action, so attaching it is a real change that needs bulk-edit
    // dependencies; omitting them must fail loudly rather than silently no-op.
    const service = createAlertAnalysisWorkflowRuleAttachmentService({
      rulesClient: createRulesClient([createRule({ id: 'rule-1' })]),
      workflowId: WORKFLOW_ID,
    });

    await expect(
      service.updateRuleAttachments({ attachRuleIds: ['rule-1'], detachRuleIds: [] })
    ).rejects.toThrow('Bulk edit dependencies are required');
  });
});
