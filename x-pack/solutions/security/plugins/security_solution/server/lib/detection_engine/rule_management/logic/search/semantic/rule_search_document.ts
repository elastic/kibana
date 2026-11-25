/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SanitizedRule } from '@kbn/alerting-plugin/common';
import type { RuleParams } from '../../../../rule_schema';

/** The format of the rule card; a new value re-embeds every rule on the next sync. */
export const RULE_CARD_VERSION = '2';

export interface RuleSearchDocument {
  card_version: string;
  space_id: string;
  so_id: string;
  rule_id: string;
  updated_at: string;
  name: string;
  description: string;
  ids: string;
  mitre_names: string[];
  tags: string[];
  query: string;
  card: string;
  rule_card: string;
}

export const ruleSearchDocumentId = (spaceId: string, soId: string) => `${spaceId}:${soId}`;

const unique = (values: Array<string | undefined>) => [
  ...new Set(values.filter((value): value is string => Boolean(value))),
];

/**
 * The rule card: what the rule detects, in the words a person would use. Name, description,
 * MITRE names, integrations and false positives; the query and the investigation guide stay
 * out of the vector (they are code and long text) but the query is searchable by words.
 */
export const buildRuleSearchDocument = (
  spaceId: string,
  rule: SanitizedRule<RuleParams>
): RuleSearchDocument => {
  const { params } = rule;
  const threat = params.threat ?? [];
  const tactics = threat.map(({ tactic }) => tactic);
  const techniques = threat.flatMap(({ technique }) => technique ?? []);
  const subtechniques = techniques.flatMap(({ subtechnique }) => subtechnique ?? []);
  const mitreNames = unique([
    ...tactics.map(({ name }) => name),
    ...techniques.map(({ name }) => name),
    ...subtechniques.map(({ name }) => name),
  ]);
  // Names with ids, so that the reranker also sees "T1003" when a user searches for it.
  const mitreLabels = unique([
    ...tactics.map(({ id, name }) => `${name} (${id})`),
    ...techniques.map(({ id, name }) => `${name} (${id})`),
    ...subtechniques.map(({ id, name }) => `${name} (${id})`),
  ]);
  const ids = unique([
    params.ruleId,
    ...tactics.map(({ id }) => id),
    ...techniques.map(({ id }) => id),
    ...subtechniques.flatMap(({ id }) => [id, id.split('.')[0]]),
  ]);
  const integrations = unique((params.relatedIntegrations ?? []).map(({ package: pkg }) => pkg));
  const falsePositives = params.falsePositives ?? [];
  const query = 'query' in params && typeof params.query === 'string' ? params.query : '';

  const card = [
    rule.name,
    params.description,
    mitreLabels.length ? `MITRE ATT&CK: ${mitreLabels.join(', ')}` : '',
    integrations.length ? `Integrations: ${integrations.join(', ')}` : '',
    falsePositives.length ? `False positives: ${falsePositives.join('; ')}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  return {
    card_version: RULE_CARD_VERSION,
    space_id: spaceId,
    so_id: rule.id,
    rule_id: params.ruleId,
    updated_at: new Date(rule.updatedAt).toISOString(),
    name: rule.name,
    description: params.description,
    ids: ids.join(' '),
    mitre_names: mitreNames,
    tags: rule.tags,
    query,
    card,
    rule_card: card,
  };
};
