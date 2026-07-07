/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import { BadRequestError } from '@kbn/securitysolution-es-utils';
import type {
  AlertAnalysisWorkflowRuleAttachmentService,
  RuleAttachmentSelection,
  RuleAttachmentSummary,
} from '../../../common/workflows/alert_analysis_workflow';
import {
  BulkActionEditTypeEnum,
  type BulkActionEditPayload,
  type NormalizedRuleAction,
} from '../../../common/api/detection_engine/rule_management';
import type { DetectionRulesAuthz } from '../../../common/detection_engine/rule_management/authz';
import type { PrebuiltRulesCustomizationStatus } from '../../../common/detection_engine/prebuilt_rules/prebuilt_rule_customization_status';
import type { MlAuthz } from '../../lib/machine_learning/authz';
import type { RuleAlertType } from '../../lib/detection_engine/rule_schema';
import { findRules } from '../../lib/detection_engine/rule_management/logic/search/find_rules';
import {
  bulkEditRules,
  type BulkEditRulesArguments,
} from '../../lib/detection_engine/rule_management/logic/bulk_actions/bulk_edit_rules';
import type { IPrebuiltRuleAssetsClient } from '../../lib/detection_engine/prebuilt_rules/logic/rule_assets/prebuilt_rule_assets_client';

export const ALERT_ANALYSIS_WORKFLOW_SYSTEM_CONNECTOR_ID = 'system-connector-.workflows';
const ALERT_ANALYSIS_WORKFLOW_ACTION_SUB_ACTION = 'run';
const MAX_RULES_TO_ATTACH = 2000;
// Detach needs one bulkEdit call per rule (each rule keeps a different remaining action
// list), so this bounds how many of those run at once instead of firing up to
// MAX_RULES_TO_ATTACH concurrently.
const DETACH_CONCURRENCY = 10;

interface WorkflowRuleActionParams {
  subAction?: string;
  subActionParams?: {
    workflowId?: string;
  };
}

interface RuleAttachmentBulkEditDependencies {
  actionsClient: ActionsClient;
  prebuiltRuleAssetClient: IPrebuiltRuleAssetsClient;
  mlAuthz: MlAuthz;
  rulesAuthz: DetectionRulesAuthz;
  ruleCustomizationStatus: PrebuiltRulesCustomizationStatus;
}

interface AlertAnalysisWorkflowRuleAttachmentServiceDependencies {
  rulesClient: RulesClient;
  workflowId: string;
  bulkEditDependencies?: RuleAttachmentBulkEditDependencies;
  bulkEditRulesFn?: typeof bulkEditRules;
}

interface MatchingRulesResult {
  total: number;
  rules: RuleAlertType[];
}

type RuleAction = RuleAlertType['actions'][number];
type RuleSystemAction = NonNullable<RuleAlertType['systemActions']>[number];
type RuleAnyAction = RuleAction | RuleSystemAction;

const normalizeSearch = (search: string): string | undefined => {
  const trimmed = search.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const compareRulesByStableDefaultSort = (ruleA: RuleAlertType, ruleB: RuleAlertType): number => {
  if (ruleA.enabled !== ruleB.enabled) {
    return ruleA.enabled ? -1 : 1;
  }

  const nameComparison = ruleA.name.localeCompare(ruleB.name);
  if (nameComparison !== 0) {
    return nameComparison;
  }

  return ruleA.id.localeCompare(ruleB.id);
};

const getRuleActions = (
  rule: Pick<RuleAlertType, 'actions' | 'systemActions'>
): RuleAnyAction[] => [...rule.actions, ...(rule.systemActions ?? [])];

const isAlertAnalysisWorkflowAction = (action: RuleAnyAction, workflowId: string): boolean => {
  const params = action.params as WorkflowRuleActionParams;

  return (
    action.id === ALERT_ANALYSIS_WORKFLOW_SYSTEM_CONNECTOR_ID &&
    params.subAction === ALERT_ANALYSIS_WORKFLOW_ACTION_SUB_ACTION &&
    params.subActionParams?.workflowId === workflowId
  );
};

export const hasAlertAnalysisWorkflowAction = (
  rule: Pick<RuleAlertType, 'actions' | 'systemActions'>,
  workflowId: string
): boolean =>
  getRuleActions(rule).some((action) => isAlertAnalysisWorkflowAction(action, workflowId));

const createAlertAnalysisWorkflowAction = (workflowId: string): NormalizedRuleAction => ({
  id: ALERT_ANALYSIS_WORKFLOW_SYSTEM_CONNECTOR_ID,
  params: {
    subAction: ALERT_ANALYSIS_WORKFLOW_ACTION_SUB_ACTION,
    subActionParams: {
      workflowId,
      // The workflow processes the whole alert batch in one run (it loops over
      // `event.alerts`), so run it once per rule execution rather than once per alert.
      summaryMode: true,
    },
  },
});

const toNormalizedRuleAction = (action: RuleAnyAction): NormalizedRuleAction => ({
  ...('group' in action && action.group ? { group: action.group } : {}),
  id: action.id,
  params: action.params,
  ...('frequency' in action && action.frequency ? { frequency: action.frequency } : {}),
  ...('alertsFilter' in action && action.alertsFilter
    ? { alerts_filter: action.alertsFilter }
    : {}),
});

const createAddWorkflowActionEdit = (workflowId: string): BulkActionEditPayload => ({
  type: BulkActionEditTypeEnum.add_rule_actions,
  value: {
    actions: [createAlertAnalysisWorkflowAction(workflowId)],
  },
});

const createSetWorkflowActionsEdit = (
  rule: RuleAlertType,
  workflowId: string
): BulkActionEditPayload => ({
  type: BulkActionEditTypeEnum.set_rule_actions,
  value: {
    actions: getRuleActions(rule)
      .filter((action) => !isAlertAnalysisWorkflowAction(action, workflowId))
      .map(toNormalizedRuleAction),
  },
});

const toRuleAttachmentSummary = (
  rule: RuleAlertType,
  workflowId: string
): RuleAttachmentSummary => ({
  id: rule.id,
  name: rule.name,
  enabled: rule.enabled,
  attached: hasAlertAnalysisWorkflowAction(rule, workflowId),
});

const getMatchingRules = async ({
  rulesClient,
  search,
}: {
  rulesClient: RulesClient;
  search: string;
}): Promise<MatchingRulesResult> => {
  const normalizedSearch = normalizeSearch(search);
  const result = await findRules({
    rulesClient,
    filter: undefined,
    fields: undefined,
    page: 1,
    perPage: MAX_RULES_TO_ATTACH,
    sortField: undefined,
    sortOrder: undefined,
    search: normalizedSearch,
    searchFields: normalizedSearch ? ['name'] : undefined,
  });

  if (result.total > MAX_RULES_TO_ATTACH) {
    throw new BadRequestError(
      `More than ${MAX_RULES_TO_ATTACH} rules matched the filter query. Try to narrow it down.`
    );
  }

  return {
    total: result.total,
    rules: result.data.sort(compareRulesByStableDefaultSort),
  };
};

const countAttachedRules = (rules: RuleAlertType[], workflowId: string): number => {
  return rules.filter((rule) => hasAlertAnalysisWorkflowAction(rule, workflowId)).length;
};

const getRulesMissingWorkflowAction = (
  rules: RuleAlertType[],
  workflowId: string
): RuleAlertType[] => {
  return rules.filter((rule) => !hasAlertAnalysisWorkflowAction(rule, workflowId));
};

const getRulesWithWorkflowAction = (
  rules: RuleAlertType[],
  workflowId: string
): RuleAlertType[] => {
  return rules.filter((rule) => hasAlertAnalysisWorkflowAction(rule, workflowId));
};

const getRulesByIds = async ({
  rulesClient,
  ruleIds,
}: {
  rulesClient: RulesClient;
  ruleIds: string[];
}): Promise<RuleAlertType[]> => {
  if (ruleIds.length > MAX_RULES_TO_ATTACH) {
    throw new BadRequestError(
      `More than ${MAX_RULES_TO_ATTACH} rules were selected. Try to narrow it down.`
    );
  }

  const { data: rules, total } = await findRules({
    rulesClient,
    filter: undefined,
    fields: undefined,
    page: 1,
    perPage: ruleIds.length,
    sortField: undefined,
    sortOrder: undefined,
    ruleIds,
  });

  if (total !== ruleIds.length) {
    throw new Error(`Failed to resolve ${ruleIds.length - total} selected rule(s)`);
  }

  return rules;
};

const getBulkEditDependencies = (
  dependencies: AlertAnalysisWorkflowRuleAttachmentServiceDependencies
): RuleAttachmentBulkEditDependencies => {
  if (!dependencies.bulkEditDependencies) {
    throw new Error('Bulk edit dependencies are required to attach the workflow to rules');
  }

  return dependencies.bulkEditDependencies;
};

export const createAlertAnalysisWorkflowRuleAttachmentService = (
  dependencies: AlertAnalysisWorkflowRuleAttachmentServiceDependencies
): AlertAnalysisWorkflowRuleAttachmentService => {
  const { rulesClient, workflowId, bulkEditRulesFn = bulkEditRules } = dependencies;

  return {
    async getRuleAttachmentStats({ search }) {
      const { total, rules } = await getMatchingRules({ rulesClient, search });

      return {
        total,
        attached: countAttachedRules(rules, workflowId),
      };
    },

    async getRuleAttachments({ search, page, perPage }) {
      const { total, rules } = await getMatchingRules({ rulesClient, search });
      const startIndex = (page - 1) * perPage;
      const pageRules = rules.slice(startIndex, startIndex + perPage);

      return {
        total,
        attached: countAttachedRules(rules, workflowId),
        page,
        perPage,
        rules: pageRules.map((rule) => toRuleAttachmentSummary(rule, workflowId)),
      };
    },

    async getRuleAttachmentSelection({ search }): Promise<RuleAttachmentSelection> {
      const { total, rules } = await getMatchingRules({ rulesClient, search });
      const rulesMissingWorkflowAction = getRulesMissingWorkflowAction(rules, workflowId);
      const rulesWithWorkflowAction = getRulesWithWorkflowAction(rules, workflowId);

      return {
        total,
        attached: rulesWithWorkflowAction.length,
        selectable: rulesMissingWorkflowAction.length,
        attachedRuleIds: rulesWithWorkflowAction.map(({ id }) => id),
        ruleIds: rulesMissingWorkflowAction.map(({ id }) => id),
      };
    },

    async updateRuleAttachments({ attachRuleIds, detachRuleIds, dryRun = false }) {
      const uniqueAttachRuleIds = [...new Set(attachRuleIds)];
      const uniqueDetachRuleIds = [...new Set(detachRuleIds)];
      const duplicatedRuleIds = uniqueAttachRuleIds.filter((id) =>
        uniqueDetachRuleIds.includes(id)
      );

      if (duplicatedRuleIds.length > 0) {
        throw new BadRequestError('Rules cannot be both attached and detached in the same request');
      }

      const uniqueRuleIds = [...uniqueAttachRuleIds, ...uniqueDetachRuleIds];
      const rules = await getRulesByIds({ rulesClient, ruleIds: uniqueRuleIds });
      const attachRuleIdSet = new Set(uniqueAttachRuleIds);
      const detachRuleIdSet = new Set(uniqueDetachRuleIds);
      const rulesToAttach = getRulesMissingWorkflowAction(
        rules.filter(({ id }) => attachRuleIdSet.has(id)),
        workflowId
      );
      const rulesToDetach = getRulesWithWorkflowAction(
        rules.filter(({ id }) => detachRuleIdSet.has(id)),
        workflowId
      );
      const updatedRulesCount = rulesToAttach.length + rulesToDetach.length;

      if (dryRun || updatedRulesCount === 0) {
        return {
          matched: uniqueRuleIds.length,
          updated: updatedRulesCount,
        };
      }

      const bulkEditDependencies = getBulkEditDependencies(dependencies);
      // Normalize each bulkEdit to a success/error count. A bulkEdit that rejects (transport
      // error) is caught and counted as failures rather than left to abort its siblings, so
      // every attach/detach is attempted and the reported counts reflect what actually happened.
      const runBulkEdit = async (
        rulesToEdit: RuleAlertType[],
        actions: BulkActionEditPayload[]
      ): Promise<{ updated: number; errors: number }> => {
        try {
          const result = await bulkEditRulesFn({
            rulesClient,
            rules: rulesToEdit,
            actions,
            ...bulkEditDependencies,
          } satisfies BulkEditRulesArguments);
          return { updated: result.rules.length, errors: result.errors.length };
        } catch (error) {
          return { updated: 0, errors: rulesToEdit.length };
        }
      };

      // Attach shares one bulkEdit for all rules (identical added action); detach needs one call
      // per rule because it rewrites each rule's full action list, so it's bounded by pMap.
      const [attachOutcome, detachOutcomes] = await Promise.all([
        rulesToAttach.length > 0
          ? runBulkEdit(rulesToAttach, [createAddWorkflowActionEdit(workflowId)])
          : Promise.resolve({ updated: 0, errors: 0 }),
        pMap(
          rulesToDetach,
          (rule) => runBulkEdit([rule], [createSetWorkflowActionsEdit(rule, workflowId)]),
          { concurrency: DETACH_CONCURRENCY }
        ),
      ]);
      const outcomes = [attachOutcome, ...detachOutcomes];
      const errorCount = outcomes.reduce((count, outcome) => count + outcome.errors, 0);

      if (errorCount > 0) {
        throw new Error(`Failed to update the alert analysis workflow on ${errorCount} rule(s)`);
      }

      return {
        matched: uniqueRuleIds.length,
        updated: outcomes.reduce((count, outcome) => count + outcome.updated, 0),
      };
    },
  };
};
