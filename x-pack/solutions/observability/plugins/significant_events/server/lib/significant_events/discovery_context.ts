/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CompactKnowledgeIndicator,
  CompactKnowledgeIndicatorFeature,
  CompactKnowledgeIndicatorQuery,
  KISearchOutput,
} from '../../agent_builder/tools/search_knowledge_indicators/handler';
import type { SearchKnowledgeIndicatorsParams } from '../../agent_builder/tools/search_knowledge_indicators/tool';

const PER_PAGE = 50;
const FEATURE_TYPES = ['dependency', 'entity', 'infrastructure'] as const;

/** What the grounding skill's Steps 1 and 2 retrieve for a batch, so the agent need not. */
export interface DiscoveryContext {
  query_kis: CompactKnowledgeIndicatorQuery[];
  feature_kis: CompactKnowledgeIndicatorFeature[];
  /** Rules with no backed query KI: grounding records `not_checked` for them. */
  unmatched_rule_uuids: string[];
  /** The query search held more results than one page. */
  truncated: boolean;
}

type KnowledgeIndicatorSearch = (
  params: SearchKnowledgeIndicatorsParams
) => Promise<KISearchOutput>;

const unique = <T>(values: readonly T[]): T[] => [...new Set(values)];

const isQuery = (
  indicator: CompactKnowledgeIndicator
): indicator is CompactKnowledgeIndicatorQuery => indicator.kind === 'query';

const isFeature = (
  indicator: CompactKnowledgeIndicator
): indicator is CompactKnowledgeIndicatorFeature => indicator.kind === 'feature';

const compactKis = (output: KISearchOutput): CompactKnowledgeIndicator[] =>
  output.view === 'compact' ? output.knowledge_indicators : [];

/**
 * Runs the same two searches the grounding skill describes: the query KIs of the batch's rules,
 * then the features those queries reference (or the batch sources' topology when none do).
 */
export const buildDiscoveryContext = async ({
  ruleUuids,
  sourceIds,
  search,
}: {
  ruleUuids: string[];
  sourceIds: string[];
  search: KnowledgeIndicatorSearch;
}): Promise<DiscoveryContext> => {
  const queryPage = await search({
    kind: ['query'],
    rule_ids: ruleUuids,
    query_types: ['match'],
    rule_backed: true,
    page: 1,
    per_page: PER_PAGE,
    view: 'compact',
  });
  const requested = new Set(ruleUuids);
  const queryKis = compactKis(queryPage)
    .filter(isQuery)
    .filter(({ rule }) => requested.has(rule.id));

  const featureIds = unique(
    queryKis.flatMap(({ query }) => (query.features ?? []).map(({ id }) => id))
  );
  const slugs = featureIds.length > 0 ? unique(queryKis.map(({ source_id: id }) => id)) : sourceIds;

  const searchFeatures = (page: number) =>
    search({
      kind: ['feature'],
      feature_types: [...FEATURE_TYPES],
      ...(featureIds.length > 0 ? { feature_ids: featureIds } : {}),
      ...(slugs.length > 0 ? { slugs } : {}),
      page,
      per_page: PER_PAGE,
      view: 'compact',
    });

  const firstFeaturePage = await searchFeatures(1);
  const featureKis = compactKis(firstFeaturePage).filter(isFeature);

  // One more page, only when referenced ids are still missing; never for the fallback search.
  const missing = featureIds.some((id) => !featureKis.some(({ feature }) => feature.id === id));
  if (featureIds.length > 0 && firstFeaturePage.has_more && missing && firstFeaturePage.next_page) {
    featureKis.push(
      ...compactKis(await searchFeatures(firstFeaturePage.next_page)).filter(isFeature)
    );
  }

  const matchedRules = new Set(queryKis.map(({ rule }) => rule.id));
  return {
    query_kis: queryKis,
    feature_kis: featureKis,
    unmatched_rule_uuids: ruleUuids.filter((ruleUuid) => !matchedRules.has(ruleUuid)),
    truncated: queryPage.has_more,
  };
};
