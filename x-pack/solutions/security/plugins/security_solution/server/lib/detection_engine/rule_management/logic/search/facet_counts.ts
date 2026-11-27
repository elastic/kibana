/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { KueryNode } from '@kbn/es-query';
import type {
  FacetCounts,
  GranularRulesFacetCategory,
} from '../../../../../../common/api/detection_engine/rule_management/granular_rules/granular_rules_contract.gen';
import type { RuleSetConditions } from '../../../../../../common/api/detection_engine/rule_sets';
import { TAGS_FIELD } from '../../../../../../common/detection_engine/rule_management/rule_fields';
import { termsBuckets } from '../../../rule_sets/logic/terms_buckets';
import { buildAggregations, expandRawAggregationResult } from './granular_facet_aggregations';
import { findRules } from './find_rules';

/**
 * The `filter_params` field that each facet category filters. `tags` is special: the `tags`
 * condition holds the tags without a prefix ("Other tags"), see `fetchDisjunctiveFacetCounts`.
 */
const CATEGORY_CONDITION: Partial<Record<GranularRulesFacetCategory, keyof RuleSetConditions>> = {
  tags: 'tags',
  integration: 'related_integrations',
  tactic: 'mitre_tactic',
  technique: 'mitre_technique',
  type: 'type',
  severity: 'severity',
  source: 'rule_source',
  enabled: 'enabled',
  lastRunOutcome: 'last_run_outcome',
};

const MAX_TAGS_PER_CATEGORY = 1000;
/** A tag with a category prefix, for example `OS: Windows` (see `tagCategoryOf`). */
const PREFIXED_TAG_REGEXP = '.+: .*';

/** Lucene regular expression syntax, used by the `include` of a terms aggregation. */
const escapeRegExp = (value: string) => value.replace(/[.?+*|{}[\]()"\\#@&<>~]/g, '\\$&');

interface FacetCountsParams {
  rulesClient: RulesClient;
  /** KQL of the table filters that are not facets (search, the old table filters). */
  filter: string | undefined;
  /** The facet conditions: `filter_params`, or the conditions of the rule scope. */
  conditions: RuleSetConditions;
  /** The rule filter for other facet conditions (one facet left out). */
  filterFor: (conditions: RuleSetConditions) => KueryNode | undefined;
  /** The counts of the main search query. */
  mainCounts: FacetCounts;
  categories: GranularRulesFacetCategory[];
  tagCategories: string[];
  /** Rule ids of the gap filter, if it is active. */
  ruleIds: string[] | undefined;
}

/**
 * Facet counts that ignore the facet's own selection, so a facet shows the values a user can still
 * add (disjunctive facets). One count query per category that has a condition, and one per tag
 * category. Categories without a condition keep the counts of the main search query.
 *
 * Tags: the client shows unselected tag categories from `counts.tags`, so the prefixed tags keep
 * their main counts; only the tags without a prefix are counted without the `tags` condition.
 */
export const fetchDisjunctiveFacetCounts = async ({
  rulesClient,
  filter,
  conditions: filterParams,
  filterFor,
  mainCounts,
  categories,
  tagCategories,
  ruleIds,
}: FacetCountsParams): Promise<{ counts: FacetCounts; tagCategoryCounts: FacetCounts }> => {
  const countWithout = (
    conditions: RuleSetConditions,
    aggregations: Parameters<typeof findRules>[0]['aggregations']
  ) =>
    findRules({
      rulesClient,
      filter,
      kueryFilter: filterFor(conditions),
      page: 1,
      perPage: 0,
      sortField: undefined,
      sortOrder: undefined,
      aggregations,
      ruleIds,
    });

  const ownFiltered = categories.filter((category) => {
    const key = CATEGORY_CONDITION[category];
    return key != null && filterParams[key] != null;
  });

  const [categoryResults, tagResults] = await Promise.all([
    Promise.all(
      ownFiltered.map(async (category) => {
        const key = CATEGORY_CONDITION[category];
        const { [key as keyof RuleSetConditions]: _own, ...others } = filterParams;
        if (category === 'tags') {
          const result = await countWithout(others, {
            other_tags: {
              terms: {
                field: TAGS_FIELD,
                size: MAX_TAGS_PER_CATEGORY,
                exclude: PREFIXED_TAG_REGEXP,
              },
            },
          });
          const prefixed = Object.entries(mainCounts.tags ?? {}).filter(([tag]) =>
            tag.includes(': ')
          );
          const other = termsBuckets(result.aggregations, 'other_tags').map(
            (b) => [String(b.key), b.doc_count] as const
          );
          return { tags: Object.fromEntries([...prefixed, ...other]) };
        }
        const result = await countWithout(others, buildAggregations({ categories: [category] }));
        return expandRawAggregationResult(result.aggregations ?? {}, [category]);
      })
    ),
    Promise.all(
      tagCategories.map(async (prefix) => {
        const { [prefix]: _own, ...otherCategories } = filterParams.tag_categories ?? {};
        const result = await countWithout(
          { ...filterParams, tag_categories: otherCategories },
          {
            tags_in_category: {
              terms: {
                field: TAGS_FIELD,
                size: MAX_TAGS_PER_CATEGORY,
                include: `${escapeRegExp(prefix)}: .*`,
              },
            },
          }
        );
        const buckets = termsBuckets(result.aggregations, 'tags_in_category');
        return [
          prefix,
          Object.fromEntries(buckets.map((b) => [String(b.key), b.doc_count])),
        ] as const;
      })
    ),
  ]);

  return {
    counts: Object.assign({ ...mainCounts }, ...categoryResults),
    tagCategoryCounts: Object.fromEntries(tagResults),
  };
};
