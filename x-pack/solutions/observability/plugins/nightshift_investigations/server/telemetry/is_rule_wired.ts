/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CLASSIC_ALERT_SOURCE, UNIVERSAL_ALERT_SOURCE } from '../../common/automation_limits';
import type {
  NightshiftAutomationAttributes,
  NightshiftTriggerRow,
} from '../lib/automations/types';

type AlertRow = Extract<NightshiftTriggerRow, { kind: 'alert' }>;

export interface RuleMatcher {
  namePattern?: string;
  names: string[];
  tags: string[];
}

export interface SnapshotRule {
  id: string;
  name: string;
  tags: string[];
}

const clean = (values: string[] | undefined): string[] =>
  (values ?? []).map((value) => value.trim()).filter(Boolean);

// Alerting v2 rule alerts carry the `internal` source.
const admitsRuleAlerts = ({ alertSources, alertSourceMode }: AlertRow): boolean => {
  const sources = clean(alertSources);
  if (sources.length === 0) return true;
  const universalSources = sources.filter((source) => source !== CLASSIC_ALERT_SOURCE);
  return universalSources.includes(UNIVERSAL_ALERT_SOURCE) === (alertSourceMode !== 'exclude');
};

/** Mirrors the trigger condition of `generateWorkflowYaml`, minus severity, which filters alerts, not rules. */
export const toRuleMatchers = (
  automations: ReadonlyArray<
    Pick<NightshiftAutomationAttributes, 'isEnabled' | 'workflowId' | 'trigger'>
  >
): RuleMatcher[] =>
  automations
    // An automation without a workflow is inert.
    .filter(({ isEnabled, workflowId }) => isEnabled && Boolean(workflowId))
    .flatMap(({ trigger }) => trigger?.rows ?? [])
    .filter((row): row is AlertRow => row.kind === 'alert')
    .filter(admitsRuleAlerts)
    .map(({ ruleNamePattern, ruleNames, tags }) => ({
      ...(ruleNamePattern ? { namePattern: ruleNamePattern } : {}),
      names: ruleNames ?? [],
      tags: tags ?? [],
    }));

export const matchesEveryRule = ({ namePattern, names, tags }: RuleMatcher): boolean =>
  !namePattern && names.length === 0 && tags.length === 0;

export const isRuleWired = (rule: SnapshotRule, matchers: readonly RuleMatcher[]): boolean =>
  matchers.some(({ namePattern, names, tags }) => {
    if (namePattern && !rule.name.includes(namePattern)) return false;
    if (names.length === 0 && tags.length === 0) return true;
    return names.includes(rule.name) || tags.some((tag) => rule.tags.includes(tag));
  });
