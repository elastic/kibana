/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import yaml from 'js-yaml';
import type { ToolingLog } from '@kbn/tooling-log';
import type { KbnClient } from '@kbn/test';
import { readUtf8File } from './fs_utils';
import { pickDefined } from './pick';
import { isRecord, isString } from './type_guards';

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
  const raw = readUtf8File(rulesetPath);
  const parsed: unknown = yaml.load(raw);
  if (!isRecord(parsed) || !Array.isArray(parsed.rules)) {
    throw new Error(`Invalid ruleset file: ${rulesetPath}`);
  }

  const rules: RulesetRuleSpec[] = parsed.rules.map((r, idx) => {
    if (!isRecord(r)) {
      throw new Error(`Invalid ruleset file: ${rulesetPath} (rules[${idx}] is not an object)`);
    }
    const id = r.id;
    if (!isString(id) || id.length === 0) {
      throw new Error(`Invalid ruleset file: ${rulesetPath} (rules[${idx}].id must be a string)`);
    }

    const ruleId = isString(r.rule_id) ? r.rule_id : undefined;
    const match = (() => {
      if (!isRecord(r.match)) return undefined;
      const tokens = r.match.name_contains_any;
      if (!Array.isArray(tokens)) return undefined;
      const filtered = tokens.filter(isString);
      return filtered.length > 0 ? { name_contains_any: filtered } : undefined;
    })();

    return { id, rule_id: ruleId, match };
  });

  return { rules };
};

const scoreByNameTokens = ({
  name,
  tokens,
  enabled,
  immutable,
}: {
  name: string;
  tokens: string[];
  enabled?: boolean;
  immutable?: boolean;
}): number => {
  const lcName = name.toLowerCase();
  const matched = tokens.filter((t) => lcName.includes(t.toLowerCase())).length;
  // name_contains_any is treated as "contains ANY token" (see ruleset docs).
  if (matched === 0) return 0;
  return matched * 10 + (enabled ? 5 : 0) + (immutable ? 1 : 0);
};

const resolveRulesetAgainstCandidates = <TCandidate, TResolved>({
  log,
  rulesetPath,
  candidates,
  strict = true,
  getRuleId,
  getName,
  getEnabled,
  getImmutable,
  toResolved,
  notFoundLabel,
  matchedLabel,
}: {
  log: ToolingLog;
  rulesetPath: string;
  candidates: TCandidate[];
  strict?: boolean;
  getRuleId: (candidate: TCandidate) => string;
  getName: (candidate: TCandidate) => string;
  getEnabled?: (candidate: TCandidate) => boolean | undefined;
  getImmutable?: (candidate: TCandidate) => boolean | undefined;
  toResolved: (candidate: TCandidate) => TResolved;
  notFoundLabel: string;
  matchedLabel: string;
}): TResolved[] => {
  const ruleset = readRulesetFile(rulesetPath);
  const resolved: TResolved[] = [];

  for (const spec of ruleset.rules) {
    if (spec.rule_id) {
      const found = candidates.find((r) => getRuleId(r) === spec.rule_id);
      if (!found) {
        const msg = `Ruleset rule_id not ${notFoundLabel}: ${spec.rule_id} (${spec.id})`;
        if (strict) throw new Error(msg);
        log.warning(`${msg}, skipping`);
      } else {
        resolved.push(toResolved(found));
      }
    } else {
      const tokens = spec.match?.name_contains_any ?? [];
      if (tokens.length === 0) {
        throw new Error(`Ruleset entry ${spec.id} missing rule_id and match.name_contains_any`);
      }

      const ranked = candidates
        .map((r) => ({
          r,
          score: scoreByNameTokens({
            name: getName(r),
            tokens,
            enabled: getEnabled?.(r),
            immutable: getImmutable?.(r),
          }),
        }))
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score || getName(a.r).localeCompare(getName(b.r)));

      const best = ranked[0]?.r;
      if (!best) {
        const msg = `Ruleset entry ${
          spec.id
        } did not match any ${matchedLabel} rules by name tokens: ${tokens.join(', ')}`;
        if (strict) throw new Error(msg);
        log.warning(`${msg}, skipping`);
      } else {
        log.info(
          `Ruleset ${spec.id} matched ${matchedLabel} rule: ${getName(best)} (${getRuleId(best)})`
        );
        resolved.push(toResolved(best));
      }
    }
  }

  return resolved;
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

export interface InstallableRuleRef {
  rule_id: string;
  name: string;
  version: number;
}

export const fetchAllInstalledRules = async ({
  kbnClient,
}: {
  kbnClient: KbnClient;
}): Promise<FindRulesResponse['data']> => {
  const perPage = 1000;
  let page = 1;
  const all: FindRulesResponse['data'] = [];

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

/**
 * Resolve ruleset entries against a list of installable prebuilt rules (from the review API),
 * returning rule_id+version so we can install only the requested set.
 */
export const resolveRulesetForInstall = ({
  log,
  rulesetPath,
  installableRules,
  strict = true,
}: {
  log: ToolingLog;
  rulesetPath: string;
  installableRules: Array<{ rule_id: string; name: string; version?: number; immutable?: boolean }>;
  strict?: boolean;
}): InstallableRuleRef[] => {
  return resolveRulesetAgainstCandidates({
    log,
    rulesetPath,
    candidates: installableRules,
    strict,
    getRuleId: (r) => r.rule_id,
    getName: (r) => r.name,
    getImmutable: (r) => r.immutable,
    toResolved: (r) => {
      if (typeof r.version !== 'number') {
        throw new Error(`Installable rule missing version for rule_id: ${r.rule_id}`);
      }
      return { rule_id: r.rule_id, name: r.name, version: r.version };
    },
    notFoundLabel: 'installable',
    matchedLabel: 'installable',
  });
};

export const enableRules = async ({
  kbnClient,
  ids,
}: {
  kbnClient: KbnClient;
  ids: string[];
}): Promise<void> => {
  if (ids.length === 0) return;
  await kbnClient.request({
    method: 'POST',
    path: `/api/detection_engine/rules/_bulk_action`,
    headers: { 'kbn-xsrf': 'true', 'elastic-api-version': PUBLIC_API_VERSION },
    body: { action: 'enable', ids },
  });
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
  const installed = await fetchAllInstalledRules({ kbnClient });
  return resolveRulesetAgainstCandidates({
    log,
    rulesetPath,
    candidates: installed,
    strict,
    getRuleId: (r) => r.rule_id,
    getName: (r) => r.name,
    getEnabled: (r) => r.enabled,
    getImmutable: (r) => r.immutable,
    toResolved: (r) => ({ id: r.id, rule_id: r.rule_id, name: r.name }),
    notFoundLabel: 'installed',
    matchedLabel: 'installed',
  });
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
  return pickDefined(rule, [
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
  ]);
};
