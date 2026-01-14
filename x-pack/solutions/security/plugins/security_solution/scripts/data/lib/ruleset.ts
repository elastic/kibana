/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import yaml from 'js-yaml';
import type { ToolingLog } from '@kbn/tooling-log';
import type { KbnClient } from '@kbn/test';

const PUBLIC_API_VERSION = '2023-10-31';

export interface RulesetRuleMatch {
  name_contains_any?: string[];
}

export interface RulesetRuleSpec {
  id: string;
  rule_id?: string;
  match?: RulesetRuleMatch;
}

export interface RulesetFile {
  rules: RulesetRuleSpec[];
}

export const readRulesetFile = (rulesetPath: string): RulesetFile => {
  const raw = fs.readFileSync(rulesetPath, 'utf8');
  const parsed = yaml.load(raw) as unknown as RulesetFile;
  if (!parsed || !Array.isArray(parsed.rules)) {
    throw new Error(`Invalid ruleset file: ${rulesetPath}`);
  }
  return parsed;
};

interface FindRulesResponse {
  total: number;
  data: Array<{
    id: string;
    rule_id: string;
    name: string;
    enabled: boolean;
    version?: number;
    revision?: number;
    immutable?: boolean;
  }>;
}

export interface ResolvedRuleRef {
  id: string; // saved object id
  rule_id: string;
  name: string;
}

export const fetchAllInstalledRules = async ({
  kbnClient,
}: {
  kbnClient: KbnClient;
}): Promise<FindRulesResponse['data']> => {
  const perPage = 1000;
  let page = 1;
  const all: FindRulesResponse['data'] = [];

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const resp = await kbnClient.request<FindRulesResponse>({
      method: 'GET',
      path: `/api/detection_engine/rules/_find?page=${page}&per_page=${perPage}&sort_field=enabled&sort_order=desc`,
      headers: { 'elastic-api-version': PUBLIC_API_VERSION },
    });
    all.push(...resp.data.data);
    if (all.length >= resp.data.total || resp.data.data.length === 0) break;
    page++;
  }

  return all;
};

const scoreCandidate = (rule: FindRulesResponse['data'][number], tokens: string[]): number => {
  const name = rule.name.toLowerCase();
  const matched = tokens.filter((t) => name.includes(t.toLowerCase())).length;
  return matched * 10 + (rule.enabled ? 5 : 0) + (rule.immutable ? 1 : 0);
};

export const resolveRuleset = async ({
  kbnClient,
  log,
  rulesetPath,
  strict = true,
}: {
  kbnClient: KbnClient;
  log: ToolingLog;
  rulesetPath: string;
  strict?: boolean;
}): Promise<ResolvedRuleRef[]> => {
  const ruleset = readRulesetFile(rulesetPath);
  const installed = await fetchAllInstalledRules({ kbnClient });

  const resolved: ResolvedRuleRef[] = [];

  for (const spec of ruleset.rules) {
    if (spec.rule_id) {
      const found = installed.find((r) => r.rule_id === spec.rule_id);
      if (!found) {
        if (strict) {
          throw new Error(`Ruleset rule_id not installed: ${spec.rule_id} (${spec.id})`);
        }
        log.warning(`Ruleset rule_id not installed, skipping: ${spec.rule_id} (${spec.id})`);
        continue;
      }
      resolved.push({ id: found.id, rule_id: found.rule_id, name: found.name });
      continue;
    }

    const tokens = spec.match?.name_contains_any ?? [];
    if (tokens.length === 0) {
      throw new Error(`Ruleset entry ${spec.id} missing rule_id and match.name_contains_any`);
    }

    const candidates = installed
      .map((r) => ({ r, score: scoreCandidate(r, tokens) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score || a.r.name.localeCompare(b.r.name));

    const best = candidates[0]?.r;
    if (!best) {
      if (strict) {
        throw new Error(
          `Ruleset entry ${spec.id} did not match any installed rules by name tokens: ${tokens.join(', ')}`
        );
      }
      log.warning(
        `Ruleset entry ${spec.id} did not match any installed rules, skipping (tokens: ${tokens.join(
          ', '
        )})`
      );
      continue;
    }

    log.info(`Ruleset ${spec.id} matched rule: ${best.name} (${best.rule_id})`);
    resolved.push({ id: best.id, rule_id: best.rule_id, name: best.name });
  }

  return resolved;
};

export const fetchRuleById = async ({
  kbnClient,
  id,
}: {
  kbnClient: KbnClient;
  id: string;
}): Promise<Record<string, unknown>> => {
  const resp = await kbnClient.request<Record<string, unknown>>({
    method: 'GET',
    path: `/api/detection_engine/rules?id=${encodeURIComponent(id)}`,
    headers: { 'elastic-api-version': PUBLIC_API_VERSION },
  });
  return resp.data;
};

/**
 * Convert the rule response to a preview/create payload by stripping read-only fields.
 * We keep a broad set of create-like properties used by the preview schema.
 */
export const toRuleCreateProps = (rule: Record<string, unknown>): Record<string, unknown> => {
  const allowed: Record<string, unknown> = {};
  const pick = (k: string) => {
    if (rule[k] !== undefined) allowed[k] = rule[k];
  };

  for (const k of [
    'name',
    'description',
    'tags',
    'interval',
    'from',
    'to',
    'rule_id',
    'risk_score',
    'severity',
    'type',
    'language',
    'index',
    'query',
    'filters',
    'max_signals',
    'timestamp_override',
    'timestamp_override_fallback_disabled',
    'rule_name_override',
    'references',
    'false_positives',
    'threat',
    'note',
    'timeline_id',
    'timeline_title',
    'exceptions_list',
    'actions',
    'meta',
    'machine_learning_job_id',
    'anomaly_threshold',
    'threshold',
    'threat_mapping',
    'threat_filters',
    'threat_index',
    'threat_query',
    'saved_id',
    'data_view_id',
    'building_block_type',
    'new_terms_fields',
    'history_window_start',
    'esql_query',
  ]) {
    pick(k);
  }

  return allowed;
};

