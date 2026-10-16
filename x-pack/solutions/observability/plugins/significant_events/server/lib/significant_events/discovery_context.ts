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

/** A query KI with the `FROM` target its grounding queries must use. */
export type DiscoveryContextQuery = CompactKnowledgeIndicatorQuery & { view_name?: string };

/**
 * What is left to do once the searches are done. Without it the agent has stopped after the
 * confirmation queries in the eval and left the profile queries out.
 */
export const REMAINING_GROUNDING_STEPS = [
  'Step 3: run the confirmation query of every rule in query_kis, in parallel waves.',
  'Step 4: profile (spread and trend) every rule whose sample returned failure rows, before any routing or write.',
] as const;

/** What the grounding skill's Steps 1 and 2 retrieve for a batch, so the agent need not. */
export interface DiscoveryContext {
  remaining_steps: readonly string[];
  /** Each source's `slug` and `view_name`. */
  sources: KISearchOutput['sources'];
  /** Rules with no backed query KI: grounding records `not_checked` for them. */
  unmatched_rule_uuids: string[];
  /** The query search held more results than one page. */
  truncated: boolean;
  query_kis: DiscoveryContextQuery[];
  feature_kis: CompactKnowledgeIndicatorFeature[];
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

  const sources = [...queryPage.sources, ...firstFeaturePage.sources].filter(
    ({ slug }, index, all) => all.findIndex((source) => source.slug === slug) === index
  );
  const viewBySlug = new Map(sources.map(({ slug, view_name: view }) => [slug, view]));
  const matchedRules = new Set(queryKis.map(({ rule }) => rule.id));
  return {
    remaining_steps: REMAINING_GROUNDING_STEPS,
    sources,
    unmatched_rule_uuids: ruleUuids.filter((ruleUuid) => !matchedRules.has(ruleUuid)),
    truncated: queryPage.has_more,
    query_kis: queryKis.map((ki) => {
      const view = viewBySlug.get(ki.source_id);
      return view ? { ...ki, view_name: view } : ki;
    }),
    feature_kis: featureKis,
  };
};
