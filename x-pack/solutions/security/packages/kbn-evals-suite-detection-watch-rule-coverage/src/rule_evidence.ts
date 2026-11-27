/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import {
  DETECTION_RULES_API_VERSION,
  PREBUILT_RULES_INSTALLATION_REVIEW_PATH,
  PREBUILT_RULES_INTERNAL_API_VERSION,
} from './constants';

/** What the evaluators need to know about the rule that a `rule_id` points to. */
export interface RuleEvidence {
  name: string;
  description: string;
  version: number;
  language?: string;
  query?: string;
  /** Set only for an installed rule. */
  enabled?: boolean;
  /** `installed` for a rule in the space, `prebuilt` for a catalog rule that is not installed. */
  source: 'installed' | 'prebuilt';
}

interface RuleFields {
  name: string;
  description: string;
  version: number;
  language?: string;
  query?: string;
  enabled?: boolean;
}

const httpStatus = (error: unknown): number | undefined =>
  typeof error === 'object' && error !== null && 'status' in error
    ? (error as { status?: number }).status
    : undefined;

const toEvidence = (
  { name, description, version, language, query, enabled }: RuleFields,
  source: RuleEvidence['source']
): RuleEvidence => ({
  name,
  description,
  version,
  language,
  query,
  // A catalog rule has no state until it is installed.
  enabled: source === 'installed' ? enabled : undefined,
  source,
});

// The rule id comes from the model output, so it is escaped before it goes into KQL.
const kqlString = (value: string): string => `"${value.replace(/[\\"]/g, '\\$&')}"`;

const findInstalledRule = async (
  fetch: HttpHandler,
  ruleId: string
): Promise<RuleFields | undefined> => {
  try {
    return await fetch<RuleFields>('/api/detection_engine/rules', {
      method: 'GET',
      headers: { 'elastic-api-version': DETECTION_RULES_API_VERSION },
      query: { rule_id: ruleId },
    });
  } catch (err) {
    if (httpStatus(err) === 404) {
      return undefined;
    }
    throw err;
  }
};

const findPrebuiltRule = async (
  fetch: HttpHandler,
  ruleId: string
): Promise<RuleFields | undefined> => {
  const { rules } = await fetch<{ rules: RuleFields[] }>(PREBUILT_RULES_INSTALLATION_REVIEW_PATH, {
    method: 'POST',
    headers: { 'elastic-api-version': PREBUILT_RULES_INTERNAL_API_VERSION },
    body: JSON.stringify({
      per_page: 1,
      filter: { term: `security-rule.rule_id: ${kqlString(ruleId)}` },
    }),
  });
  return rules[0];
};

/**
 * Reads the rule the check named: an installed rule first, then a prebuilt rule that is not
 * installed. Returns undefined when no rule has this id.
 */
export const fetchRuleEvidence = async (
  fetch: HttpHandler,
  ruleId: string
): Promise<RuleEvidence | undefined> => {
  const installed = await findInstalledRule(fetch, ruleId);
  if (installed) {
    return toEvidence(installed, 'installed');
  }
  const prebuilt = await findPrebuiltRule(fetch, ruleId);
  return prebuilt ? toEvidence(prebuilt, 'prebuilt') : undefined;
};

/**
 * Reads each rule once per experiment. The rules do not change during an experiment: the
 * fixture rules are installed before it starts and removed after it ends.
 */
export class RuleLookup {
  private readonly rules = new Map<string, Promise<RuleEvidence | undefined>>();

  constructor(private readonly fetch: HttpHandler) {}

  find(ruleId: string): Promise<RuleEvidence | undefined> {
    const cached = this.rules.get(ruleId);
    if (cached) {
      return cached;
    }
    const pending = fetchRuleEvidence(this.fetch, ruleId);
    this.rules.set(ruleId, pending);
    // Do not keep a failed read, so the next evaluator tries again.
    pending.catch(() => this.rules.delete(ruleId));
    return pending;
  }
}
