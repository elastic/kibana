/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';
import { DETECTION_RULES_API_VERSION } from './constants';

/** A custom query rule the verdict examples need installed. */
export interface FixtureRule {
  ruleId: string;
  name: string;
  description: string;
  query: string;
  index: string;
  enabled: boolean;
  tactic: { id: string; name: string };
  technique: { id: string; name: string };
}

const RULES_PATH = '/api/detection_engine/rules';
const rulesHeaders = { 'elastic-api-version': DETECTION_RULES_API_VERSION };

const httpStatus = (error: unknown): number | undefined =>
  typeof error === 'object' && error !== null && 'status' in error
    ? (error as { status?: number }).status
    : undefined;

const deleteRule = async (fetch: HttpHandler, ruleId: string): Promise<void> => {
  try {
    await fetch(RULES_PATH, {
      method: 'DELETE',
      headers: rulesHeaders,
      query: { rule_id: ruleId },
    });
  } catch (err) {
    if (httpStatus(err) !== 404) {
      throw err;
    }
  }
};

const toRuleBody = (rule: FixtureRule): Record<string, unknown> => ({
  rule_id: rule.ruleId,
  name: rule.name,
  description: rule.description,
  type: 'query',
  language: 'kuery',
  query: rule.query,
  index: [rule.index],
  enabled: rule.enabled,
  severity: 'high',
  risk_score: 73,
  interval: '5m',
  from: 'now-6m',
  threat: [
    {
      framework: 'MITRE ATT&CK',
      tactic: {
        ...rule.tactic,
        reference: `https://attack.mitre.org/tactics/${rule.tactic.id}/`,
      },
      technique: [
        {
          ...rule.technique,
          reference: `https://attack.mitre.org/techniques/${rule.technique.id}/`,
        },
      ],
    },
  ],
});

/**
 * Installs the rules, replacing a copy that an earlier run left behind. Returns the cleanup
 * that removes them.
 */
export const installFixtureRules = async ({
  fetch,
  log,
  rules,
}: {
  fetch: HttpHandler;
  log: ToolingLog;
  rules: readonly FixtureRule[];
}): Promise<() => Promise<void>> => {
  const removeAll = async (): Promise<void> => {
    for (const { ruleId } of rules) {
      await deleteRule(fetch, ruleId);
    }
  };

  await removeAll();
  for (const rule of rules) {
    await fetch(RULES_PATH, {
      method: 'POST',
      headers: rulesHeaders,
      body: JSON.stringify(toRuleBody(rule)),
    });
  }
  log.info(`Installed ${rules.length} fixture rules`);
  return removeAll;
};
