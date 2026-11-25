/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  FacetCounts,
  GranularRulesFacetCategory,
} from '../../../../common/api/detection_engine/rule_management';
import type {
  RuleSetConditions,
  RuleSetLastRunOutcome,
  RuleSetRuleType,
  RuleSetValues,
} from '../../../../common/api/detection_engine/rule_sets';
import { RuleSetRuleTypeEnum } from '../../../../common/api/detection_engine/rule_sets';
import type { Severity } from '../../../../common/api/detection_engine/model/rule_schema';
import {
  DEFAULT_ANY_MATCH,
  normalizeRuleSetConditions,
  tagCategoryOf,
} from '../../../../common/detection_engine/rule_sets/rule_set_conditions';
import { SEVERITY_COLOR } from '../../../common/utils/risk_color_palette';
import { RULE_TYPE_LABELS, SEVERITY_LABELS } from '../components/translations';
import * as i18n from './translations';

/** Included and excluded values of one facet. */
export interface FacetSelection {
  include: string[];
  exclude: string[];
}

export interface FacetValue {
  value: string;
  label: string;
  count: number;
}

/**
 * One filterable rule field. The same list drives the facet panel of the rules table, the facet
 * panel of the rule set editor and the active filter chips, so a new field shows up everywhere.
 */
/** Panel sections: what the rule is, what happens to it now, and its tags. */
export type FacetSection = 'rule' | 'state' | 'tags';

export interface FacetField {
  id: string;
  section: FacetSection;
  label: string;
  canExclude: boolean;
  /** A rule has one value of this field: selecting a value replaces the previous one. */
  single?: boolean;
  get: (conditions: RuleSetConditions) => FacetSelection;
  set: (conditions: RuleSetConditions, next: FacetSelection) => RuleSetConditions;
  /** The values with counts, from the `_search` facet counts. */
  values: (counts: FacetCountsResult, labels: FacetLabels) => FacetValue[];
  /** The values have a natural order (severity), so the panel does not sort them by count. */
  ordered?: boolean;
  /** A readable label of one stored value, for chips. */
  valueLabel: (value: string, labels: FacetLabels) => string;
  /** A colored dot before the value, for fields with a color code (severity, last response). */
  dotColor?: (value: string) => string | undefined;
}

export interface FacetCountsResult {
  counts: FacetCounts;
  tagCategoryCounts: FacetCounts;
  /**
   * Counted over a search by meaning, ranked only inside the selected facets: the other values
   * of a facet with a selection have no count (it would take one more search per facet).
   */
  byMeaning?: boolean;
}

export interface FacetLabels {
  integrationTitles: Map<string, string>;
}

/**
 * Tag prefixes that mostly repeat a rule field (MITRE tactic, rule type): listed last. They stay,
 * because some of their tags have no rule field, for example "Rule Type: BBR".
 */
const LAST_TAG_CATEGORIES = new Set(['Tactic', 'Rule Type']);

const RULE_TYPES: readonly string[] = Object.values(RuleSetRuleTypeEnum);
const SEVERITIES: readonly string[] = ['low', 'medium', 'high', 'critical'];

const selectionOf = (field?: { include?: string[]; exclude?: string[] }): FacetSelection => ({
  include: field?.include ?? [],
  exclude: field?.exclude ?? [],
});

const withValues = (
  conditions: RuleSetConditions,
  key: 'related_integrations' | 'mitre_tactic' | 'tags',
  next: FacetSelection
): RuleSetConditions =>
  normalizeRuleSetConditions({
    ...conditions,
    [key]: { ...conditions[key], ...next, match: conditions[key]?.match ?? DEFAULT_ANY_MATCH },
  });

const bucketValues = (
  bucket: Record<string, number> | undefined,
  label: (value: string) => string = (value) => value
): FacetValue[] =>
  Object.entries(bucket ?? {}).map(([value, count]) => ({ value, label: label(value), count }));

const INTEGRATION_FIELD: FacetField = {
  id: 'integration',
  section: 'rule',
  label: i18n.INTEGRATION,
  canExclude: true,
  get: (c) => selectionOf(c.related_integrations),
  set: (c, next) => withValues(c, 'related_integrations', next),
  values: ({ counts }, { integrationTitles }) =>
    bucketValues(counts.integration, (name) => integrationTitles.get(name) ?? name),
  valueLabel: (name, { integrationTitles }) => integrationTitles.get(name) ?? name,
};

const TACTIC_FIELD: FacetField = {
  id: 'tactic',
  section: 'rule',
  label: i18n.MITRE_TACTIC,
  canExclude: true,
  get: (c) => selectionOf(c.mitre_tactic),
  set: (c, next) => withValues(c, 'mitre_tactic', next),
  values: ({ counts }) => bucketValues(counts.tactic),
  valueLabel: (value) => value,
};

const TYPE_FIELD: FacetField = {
  id: 'type',
  section: 'rule',
  label: i18n.RULE_TYPE,
  canExclude: true,
  get: (c) => selectionOf(c.type),
  set: (c, { include, exclude }) =>
    normalizeRuleSetConditions({
      ...c,
      type: {
        include: include.filter((v): v is RuleSetRuleType => RULE_TYPES.includes(v)),
        exclude: exclude.filter((v): v is RuleSetRuleType => RULE_TYPES.includes(v)),
      },
    }),
  values: ({ counts }) =>
    bucketValues(counts.type, (type) => RULE_TYPE_LABELS[type] ?? type).filter(({ value }) =>
      RULE_TYPES.includes(value)
    ),
  valueLabel: (type) => RULE_TYPE_LABELS[type] ?? type,
};

const SEVERITY_FIELD: FacetField = {
  id: 'severity',
  section: 'rule',
  ordered: true,
  label: i18n.SEVERITY,
  canExclude: true,
  get: (c) => selectionOf(c.severity),
  set: (c, { include, exclude }) =>
    normalizeRuleSetConditions({
      ...c,
      severity: {
        include: include.filter((v): v is Severity => SEVERITIES.includes(v)),
        exclude: exclude.filter((v): v is Severity => SEVERITIES.includes(v)),
      },
    }),
  values: ({ counts }) =>
    [...SEVERITIES].reverse().map((severity) => ({
      value: severity,
      label: SEVERITY_LABELS[severity] ?? severity,
      count: counts.severity?.[severity] ?? 0,
    })),
  valueLabel: (severity) => SEVERITY_LABELS[severity] ?? severity,
  dotColor: (severity) => SEVERITY_COLOR[severity as Severity],
};

/** The `source` facet counts by `params.immutable`: true is Elastic (external), false is custom. */
const SOURCE_FIELD: FacetField = {
  id: 'source',
  section: 'rule',
  ordered: true,
  label: i18n.SOURCE,
  canExclude: false,
  single: true,
  get: (c) => selectionOf(c.rule_source),
  set: (c, { include }) =>
    normalizeRuleSetConditions({
      ...c,
      rule_source: include.length
        ? { include: [include[include.length - 1] === 'internal' ? 'internal' : 'external'] }
        : undefined,
    }),
  values: ({ counts }) => [
    { value: 'external', label: i18n.SOURCE_ELASTIC, count: counts.source?.true ?? 0 },
    { value: 'internal', label: i18n.SOURCE_CUSTOM, count: counts.source?.false ?? 0 },
  ],
  valueLabel: (value) => (value === 'internal' ? i18n.SOURCE_CUSTOM : i18n.SOURCE_ELASTIC),
};

export const RULE_FIELD_FACETS: FacetField[] = [
  INTEGRATION_FIELD,
  TACTIC_FIELD,
  TYPE_FIELD,
  SEVERITY_FIELD,
  SOURCE_FIELD,
];

const STATUS_FIELD: FacetField = {
  id: 'enabled',
  section: 'state',
  ordered: true,
  label: i18n.STATUS,
  canExclude: false,
  single: true,
  get: (c) => ({ include: c.enabled == null ? [] : [String(c.enabled)], exclude: [] }),
  set: (c, { include }) =>
    normalizeRuleSetConditions({
      ...c,
      enabled: include.length ? include[include.length - 1] === 'true' : undefined,
    }),
  values: ({ counts }) => [
    { value: 'true', label: i18n.ENABLED, count: counts.enabled?.true ?? 0 },
    { value: 'false', label: i18n.DISABLED, count: counts.enabled?.false ?? 0 },
  ],
  valueLabel: (value) => (value === 'true' ? i18n.ENABLED : i18n.DISABLED),
};

const LAST_RUN_OUTCOMES: readonly string[] = ['succeeded', 'warning', 'failed'];
const isLastRunOutcome = (value: string): value is RuleSetLastRunOutcome =>
  LAST_RUN_OUTCOMES.includes(value);
const LAST_RESPONSE_LABELS: Record<string, string> = {
  succeeded: i18n.SUCCEEDED,
  warning: i18n.WARNING,
  failed: i18n.FAILED,
};
const LAST_RESPONSE_COLORS: Record<string, string> = {
  succeeded: 'success',
  warning: 'warning',
  failed: 'danger',
};

const LAST_RESPONSE_FIELD: FacetField = {
  id: 'lastResponse',
  section: 'state',
  ordered: true,
  label: i18n.LAST_RESPONSE,
  canExclude: true,
  get: (c) => selectionOf(c.last_run_outcome),
  set: (c, { include, exclude }) =>
    normalizeRuleSetConditions({
      ...c,
      last_run_outcome: {
        include: include.filter(isLastRunOutcome),
        exclude: exclude.filter(isLastRunOutcome),
      },
    }),
  values: ({ counts }) =>
    LAST_RUN_OUTCOMES.map((outcome) => ({
      value: outcome,
      label: LAST_RESPONSE_LABELS[outcome],
      count: counts.lastRunOutcome?.[outcome] ?? 0,
    })),
  valueLabel: (outcome) => LAST_RESPONSE_LABELS[outcome] ?? outcome,
  dotColor: (outcome) => LAST_RESPONSE_COLORS[outcome],
};

/** Rule state changes without an edit (a run, a bulk enable), so a set by state changes too. */
export const STATE_FACETS: FacetField[] = [STATUS_FIELD, LAST_RESPONSE_FIELD];

/** Facet counts categories that the panel asks `_search` for. */
export const FACET_COUNT_CATEGORIES: GranularRulesFacetCategory[] = [
  'integration',
  'tactic',
  'type',
  'severity',
  'source',
  'tags',
  'enabled',
  'lastRunOutcome',
];

const tagCategoryField = (category: string): FacetField => ({
  id: `tag:${category}`,
  section: 'tags',
  label: category,
  canExclude: true,
  get: (c) => selectionOf(c.tag_categories?.[category]),
  set: (c, next) =>
    normalizeRuleSetConditions({
      ...c,
      tag_categories: {
        ...c.tag_categories,
        [category]: {
          ...c.tag_categories?.[category],
          ...next,
          match: c.tag_categories?.[category]?.match ?? DEFAULT_ANY_MATCH,
        } satisfies RuleSetValues,
      },
    }),
  values: ({ counts, tagCategoryCounts }) =>
    // With a selection, the server counted this category without it; otherwise the tags of the
    // main query are the same numbers.
    bucketValues(tagCategoryCounts[category] ?? counts.tags)
      .filter(({ value }) => tagCategoryOf(value) === category)
      .map((value) => ({ ...value, label: value.value.slice(category.length + 2) })),
  valueLabel: (tag) => tag.slice(category.length + 2),
});

const OTHER_TAGS_FIELD: FacetField = {
  id: 'tags',
  section: 'tags',
  label: i18n.OTHER_TAGS,
  canExclude: true,
  get: (c) => selectionOf(c.tags),
  set: (c, next) => withValues(c, 'tags', next),
  values: ({ counts }) => bucketValues(counts.tags).filter(({ value }) => !tagCategoryOf(value)),
  valueLabel: (tag) => tag,
};

/**
 * One facet per tag prefix found in the rules, biggest first, then the tags without a prefix.
 * Customer prefixes ("Team: …", "Project: …") get their facet without any setup.
 */
export const tagFacets = (
  counts: FacetCountsResult | undefined,
  conditions: RuleSetConditions
): FacetField[] => {
  const sizes = new Map<string, number>();
  for (const [tag, count] of Object.entries(counts?.counts.tags ?? {})) {
    const category = tagCategoryOf(tag);
    if (category) {
      sizes.set(category, (sizes.get(category) ?? 0) + count);
    }
  }
  // A selected category stays even when the current filters leave it without rules.
  Object.keys(conditions.tag_categories ?? {}).forEach((category) => {
    if (!sizes.has(category)) sizes.set(category, 0);
  });
  const categories = [...sizes.entries()]
    .sort(
      (a, b) =>
        Number(LAST_TAG_CATEGORIES.has(a[0])) - Number(LAST_TAG_CATEGORIES.has(b[0])) || b[1] - a[1]
    )
    .map(([name]) => name);
  return [...categories.map(tagCategoryField), OTHER_TAGS_FIELD];
};

/** The facet of one tag: its prefix category, or "Other tags". */
export const tagFieldOf = (tag: string): FacetField => {
  const category = tagCategoryOf(tag);
  return category ? tagCategoryField(category) : OTHER_TAGS_FIELD;
};

export const allFacetFields = (
  counts: FacetCountsResult | undefined,
  conditions: RuleSetConditions
): FacetField[] => [...RULE_FIELD_FACETS, ...STATE_FACETS, ...tagFacets(counts, conditions)];

export const hasSelection = ({ include, exclude }: FacetSelection) =>
  include.length > 0 || exclude.length > 0;
