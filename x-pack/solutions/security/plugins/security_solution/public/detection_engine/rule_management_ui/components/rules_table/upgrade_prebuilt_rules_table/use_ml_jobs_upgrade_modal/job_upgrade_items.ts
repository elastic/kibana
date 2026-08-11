/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleUpgradeState } from '../../../../../rule_management/model/prebuilt_rule_upgrade';

export type MlLinkedJobUpgradeKind =
  /** Target jobs differ — install/start new jobs as part of rule upgrade */
  | 'job_id_change'
  /**
   * Structural job migration (e.g. non-EA → Entity Analytics `_ea` jobs).
   * Requires an explicit breaking-change warning before proceeding.
   */
  | 'breaking_job_change';

export interface MlLinkedJobUpgradeItem {
  ruleId: string;
  ruleName: string;
  currentJobIds: string[];
  targetJobIds: string[];
  kind: MlLinkedJobUpgradeKind;
}

const toJobIdList = (value: string | string[] | undefined): string[] => {
  if (value == null) {
    return [];
  }
  return (Array.isArray(value) ? value : [value]).filter(Boolean);
};

const sameJobIds = (a: string[], b: string[]): boolean => {
  if (a.length !== b.length) {
    return false;
  }
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((id, index) => id === sortedB[index]);
};

const isEntityAnalyticsMigration = (currentJobIds: string[], targetJobIds: string[]): boolean => {
  if (currentJobIds.length === 0 || targetJobIds.length === 0) {
    return false;
  }
  const currentHasEa = currentJobIds.some((id) => id.endsWith('_ea'));
  const targetHasEa = targetJobIds.some((id) => id.endsWith('_ea'));
  return !currentHasEa && targetHasEa;
};

/**
 * Builds the ML job actions that should be confirmed when upgrading the given rules.
 * Only rules whose `machine_learning_job_id` changes are included.
 */
export const buildMlLinkedJobUpgradeItems = (
  rules: Array<Pick<RuleUpgradeState, 'rule_id' | 'current_rule' | 'target_rule'>>
): MlLinkedJobUpgradeItem[] => {
  const items: MlLinkedJobUpgradeItem[] = [];

  for (const rule of rules) {
    if (rule.current_rule.type !== 'machine_learning' && rule.target_rule.type !== 'machine_learning') {
      continue;
    }

    const currentJobIds = toJobIdList(
      'machine_learning_job_id' in rule.current_rule
        ? rule.current_rule.machine_learning_job_id
        : undefined
    );
    const targetJobIds = toJobIdList(
      'machine_learning_job_id' in rule.target_rule
        ? rule.target_rule.machine_learning_job_id
        : undefined
    );

    if (sameJobIds(currentJobIds, targetJobIds)) {
      continue;
    }

    items.push({
      ruleId: rule.rule_id,
      ruleName: rule.target_rule.name || rule.current_rule.name,
      currentJobIds,
      targetJobIds,
      kind: isEntityAnalyticsMigration(currentJobIds, targetJobIds)
        ? 'breaking_job_change'
        : 'job_id_change',
    });
  }

  return items;
};
