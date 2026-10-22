/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  INFERRED_FEATURE_TYPES,
  MAX_ID_LENGTH,
  MAX_TEXT_LENGTH,
  normalizeFeatureSlug,
  type Feature,
} from '@kbn/significant-events-schema';
import type { SimilarFeatureHit } from '@kbn/nightshift-ai';
import { z } from '@kbn/zod/v4';
import pLimit from 'p-limit';
import type { KnowledgeIndicatorClient } from '../../knowledge_indicators';

export const MAX_SEARCH_CANDIDATES = 50;

export const FEATURE_SIMILARITY_TOOL_DESCRIPTION =
  'Search known feature Knowledge Indicators by meaning for one or more candidate features, across ' +
  'every source you can read in this space. Pass every candidate absent from known_feature_ids in ' +
  'the candidates array; results are grouped by candidate_id, each with at most five same-type ' +
  'matches in semantic relevance order. A match may come from another source: `sources` lists the ' +
  'slug of every source holding it, and `properties` is the identity to compare against the candidate.';

export const featureCandidateSchema = z.object({
  candidate_id: z
    .string()
    .max(MAX_ID_LENGTH)
    .describe('Stable ID intended for the candidate feature.'),
  title: z.string().max(MAX_TEXT_LENGTH).describe('Candidate feature title.'),
  description: z.string().max(MAX_TEXT_LENGTH).describe('Candidate feature description.'),
  type: z.enum(INFERRED_FEATURE_TYPES).describe('Candidate feature type.'),
});

export type FeatureCandidate = z.infer<typeof featureCandidateSchema>;

export interface FeatureSimilarityGroup {
  candidate_id: string;
  features: SimilarFeatureHit[];
  error?: string;
}

export type SourceSlugResolver = (sourceId: string) => string;

const MAX_SIMILAR_FEATURES = 5;

const toTime = (value?: string): number => {
  const time = value ? Date.parse(value) : NaN;
  return Number.isNaN(time) ? 0 : time;
};

const compareRepresentative = (currentSourceId: string) => (a: Feature, b: Feature) =>
  b.confidence - a.confidence ||
  Number(b.source_id === currentSourceId) - Number(a.source_id === currentSourceId) ||
  toTime(b.updated_at) - toTime(a.updated_at);

const collapseBySlug = (
  features: Feature[],
  currentSourceId: string,
  getSourceSlug: SourceSlugResolver
): SimilarFeatureHit[] => {
  const bySlug = new Map<string, Feature[]>();
  for (const feature of features) {
    const slug = normalizeFeatureSlug(feature.id);
    bySlug.set(slug, [...(bySlug.get(slug) ?? []), feature]);
  }

  return Array.from(bySlug.values()).map((group) => {
    const [representative] = [...group].sort(compareRepresentative(currentSourceId));
    const { id, title, description, type, subtype, properties, confidence } = representative;
    return {
      id,
      title: title ?? id,
      description,
      type,
      ...(subtype ? { subtype } : {}),
      properties,
      confidence,
      sources: Array.from(
        new Set(group.map(({ source_id: sourceId }) => getSourceSlug(sourceId)))
      ).sort(),
    };
  });
};

export interface FindSimilarFeaturesScope {
  kiClient: Pick<KnowledgeIndicatorClient, 'findFeaturesAcrossSources' | 'getFeatureSourcesBySlug'>;
  sourceIds: string[];
  currentSourceId: string;
  getSourceSlug: SourceSlugResolver;
}

export const findSimilarFeatures = async ({
  kiClient,
  sourceIds,
  currentSourceId,
  getSourceSlug,
  args,
}: FindSimilarFeaturesScope & { args: FeatureCandidate }): Promise<SimilarFeatureHit[]> => {
  // No limit: ranked rows are per-source copies, so a prefix of them may hold only a few slugs.
  const { hits } = await kiClient.findFeaturesAcrossSources(
    sourceIds,
    `${args.candidate_id} ${args.title} ${args.description}`.trim(),
    { featureType: args.type, searchMode: 'semantic' }
  );

  const similar = collapseBySlug(hits, currentSourceId, getSourceSlug).slice(
    0,
    MAX_SIMILAR_FEATURES
  );
  if (similar.length === 0) {
    return similar;
  }

  // The ranking window is bounded, so it may hold only some copies of a slug.
  const holders = await kiClient.getFeatureSourcesBySlug(
    sourceIds,
    args.type,
    similar.map(({ id }) => normalizeFeatureSlug(id))
  );
  return similar.map((hit) => {
    const exact = holders.get(normalizeFeatureSlug(hit.id))?.map(getSourceSlug) ?? [];
    return { ...hit, sources: Array.from(new Set([...hit.sources, ...exact])).sort() };
  });
};

const CANDIDATE_CONCURRENCY = 5;

export const searchFeaturesForCandidates = async ({
  candidates,
  ...scope
}: FindSimilarFeaturesScope & { candidates: FeatureCandidate[] }): Promise<
  FeatureSimilarityGroup[]
> => {
  const limiter = pLimit(CANDIDATE_CONCURRENCY);
  return Promise.all(
    candidates.map((candidate) =>
      limiter(async () => {
        try {
          const features = await findSimilarFeatures({ ...scope, args: candidate });
          return { candidate_id: candidate.candidate_id, features };
        } catch (error) {
          return {
            candidate_id: candidate.candidate_id,
            features: [],
            error: error instanceof Error ? error.message : String(error),
          };
        }
      })
    )
  );
};
