/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fullyEscapeKQLStringParam, prepareKQLStringParam } from '../../../../common/utils/kql';
import { PREBUILT_RULE_ASSETS_SO_TYPE } from '../../../lib/detection_engine/prebuilt_rules/logic/rule_assets/prebuilt_rule_assets_type';

// The subset of the tool's structured filter that the KQL builder consumes. Kept structurally
// compatible with the tool's `findPrebuiltRulesFilterSchema` inferred type (which is the source of
// truth for validation); this leaf module stays free of any dependency on the tool.
interface PrebuiltRulesFilter {
  keywords?: string;
  severity?: string[];
  ruleType?: string[];
  tags?: string[];
  mitreTechnique?: string[];
  mitreTactic?: string[];
  relatedIntegrations?: string[];
  ruleIds?: string[];
}

// ---- Filter building ----
//
// Builds a single KQL string over the `security-rule` saved-object attributes from the
// structured params. Different params are ANDed together; array params are ORed within
// the same field. Enum- and regex-constrained values (severity, ruleType, MITRE IDs) are
// emitted unquoted; free-form values (tags, tactic name, packages, rule IDs) are quoted
// and escaped.

const field = (name: string): string => `${PREBUILT_RULE_ASSETS_SO_TYPE}.${name}`;

const NAME_FIELD = field('name');
const DESCRIPTION_FIELD = field('description');
const SEVERITY_FIELD = field('severity');
const TYPE_FIELD = field('type');
const TAGS_FIELD = field('tags');
const TACTIC_ID_FIELD = field('threat.tactic.id');
const TACTIC_NAME_FIELD = field('threat.tactic.name');
const TECHNIQUE_ID_FIELD = field('threat.technique.id');
const SUBTECHNIQUE_ID_FIELD = field('threat.technique.subtechnique.id');
const RELATED_INTEGRATIONS_PACKAGE_FIELD = field('related_integrations.package');
const RULE_ID_FIELD = field('rule_id');

const buildKeywordsClause = (keywords: string): string | undefined => {
  const tokens = keywords
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => fullyEscapeKQLStringParam(token));

  if (tokens.length === 0) {
    return undefined;
  }

  const value = tokens.length === 1 ? tokens[0] : `(${tokens.join(' AND ')})`;
  return `(${NAME_FIELD}: ${value} OR ${DESCRIPTION_FIELD}: ${value})`;
};

// Renders `<field>: (v1 OR v2 OR ...)`. Free-form values (`quote: true`) are quoted and escaped;
// enum- and regex-constrained values (`quote: false`) are emitted as-is.
const orClause = (fieldName: string, values: string[], { quote }: { quote: boolean }): string => {
  const rendered = quote ? values.map(prepareKQLStringParam) : values;
  return `${fieldName}: (${rendered.join(' OR ')})`;
};

// ORs sub-clauses together, wrapping in parentheses only when there is more than one. Ignores
// `undefined` entries so callers can pass conditional clauses inline.
const orJoin = (clauses: Array<string | undefined>): string | undefined => {
  const present = clauses.filter((clause): clause is string => clause !== undefined);
  if (present.length === 0) {
    return undefined;
  }
  return present.length === 1 ? present[0] : `(${present.join(' OR ')})`;
};

export const buildPrebuiltRulesToolFilter = (
  filter: PrebuiltRulesFilter = {}
): string | undefined => {
  const parts: string[] = [];

  if (filter.keywords) {
    const clause = buildKeywordsClause(filter.keywords);
    if (clause) {
      parts.push(clause);
    }
  }

  if (filter.severity?.length) {
    parts.push(orClause(SEVERITY_FIELD, filter.severity, { quote: false }));
  }

  if (filter.ruleType?.length) {
    parts.push(orClause(TYPE_FIELD, filter.ruleType, { quote: false }));
  }

  if (filter.tags?.length) {
    parts.push(orClause(TAGS_FIELD, filter.tags, { quote: true }));
  }

  if (filter.mitreTechnique?.length) {
    // Sub-technique IDs (e.g. T1059.001) live in a different field than technique IDs.
    const techniqueIds = filter.mitreTechnique.filter((value) => !value.includes('.'));
    const subtechniqueIds = filter.mitreTechnique.filter((value) => value.includes('.'));
    const clause = orJoin([
      techniqueIds.length
        ? orClause(TECHNIQUE_ID_FIELD, techniqueIds, { quote: false })
        : undefined,
      subtechniqueIds.length
        ? orClause(SUBTECHNIQUE_ID_FIELD, subtechniqueIds, { quote: false })
        : undefined,
    ]);
    if (clause) {
      parts.push(clause);
    }
  }

  if (filter.mitreTactic?.length) {
    // Each value is routed by shape: a TA-ID hits threat.tactic.id, a display name hits
    // threat.tactic.name (quoted). Values of both kinds are OR-ed across the two fields.
    const tacticIds = filter.mitreTactic.filter((value) => /^TA\d{4}$/i.test(value));
    const tacticNames = filter.mitreTactic.filter((value) => !/^TA\d{4}$/i.test(value));
    const clause = orJoin([
      tacticIds.length ? orClause(TACTIC_ID_FIELD, tacticIds, { quote: false }) : undefined,
      tacticNames.length ? orClause(TACTIC_NAME_FIELD, tacticNames, { quote: true }) : undefined,
    ]);
    if (clause) {
      parts.push(clause);
    }
  }

  if (filter.relatedIntegrations?.length) {
    parts.push(
      orClause(RELATED_INTEGRATIONS_PACKAGE_FIELD, filter.relatedIntegrations, { quote: true })
    );
  }

  if (filter.ruleIds?.length) {
    parts.push(orClause(RULE_ID_FIELD, filter.ruleIds, { quote: true }));
  }

  return parts.length > 0 ? parts.join(' AND ') : undefined;
};
