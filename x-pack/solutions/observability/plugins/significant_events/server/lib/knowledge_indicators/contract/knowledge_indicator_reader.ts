/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Condition } from '@kbn/streamlang';
import type { SourcesClient } from '@kbn/nightshift-sources-plugin/server';
import { deriveQueryType } from '@kbn/streams-schema';
import { listAllSources } from '../../../routes/utils/list_all_sources';
import type { IndicatorReader } from '../knowledge_indicator_client/indicator_reader';
import { REVISION_SIZE_LIMIT } from '../knowledge_indicator_client/revision_reader';

/** A query knowledge indicator of the request's space, as other plugins read it. */
export interface QueryKnowledgeIndicator {
  /** Unique within its source only; two sources can hold the same id. */
  id: string;
  source_id: string;
  /** Whether the source is enabled; a disabled source keeps its knowledge indicators. */
  source_enabled: boolean;
  title: string;
  description: string;
  /** The ES|QL query, as stored. */
  esql: string;
  /** 0 to 100, when the knowledge indicator has one. */
  severity_score?: number;
  /** `stats` when the query has a `STATS` command, `match` otherwise. */
  query_type: 'match' | 'stats';
  /** Ids of the features the query was written for, in the same source. */
  feature_ids: string[];
  /** ISO timestamp after which the knowledge indicator is stale, when it expires. */
  expires_at?: string;
}

/** A feature knowledge indicator of the request's space, as other plugins read it. */
export interface KnowledgeIndicatorFeature {
  /** Unique within its source; what {@link QueryKnowledgeIndicator.feature_ids} names. */
  id: string;
  source_id: string;
  type: string;
  subtype?: string;
  title?: string;
  properties: Record<string, unknown>;
  /** The condition that selects the feature's documents, when it has one. */
  filter?: Condition;
}

/**
 * Reads the knowledge indicators of one space. Read-only: other plugins never write knowledge
 * indicators through this contract.
 */
export interface KnowledgeIndicatorReader {
  /**
   * Every live query knowledge indicator of the space, rule-backed or not. Expired ones and those
   * of deleted sources are left out; those of disabled sources are kept, with `source_enabled: false`.
   * Throws when the space has more than one read returns (10,000), rather than return part of them.
   * The source catalog is read as the request, so a principal that can't read `nightshift-source`
   * sees no knowledge indicators at all, even though they exist.
   */
  listQueryKnowledgeIndicators(): Promise<QueryKnowledgeIndicator[]>;
  /**
   * The live features of the given sources, of the given types (`entity`, `dependency`, ...). No
   * types gives no features. Returns at most 10,000, most confident first, and does not throw past
   * that: a caller missing a feature has to fall back to the source.
   */
  listFeatures(params: {
    sourceIds: string[];
    types: string[];
  }): Promise<KnowledgeIndicatorFeature[]>;
}

/** Builds the reader on the plugin's own knowledge indicator reads and the request's sources. */
export const createKnowledgeIndicatorReader = ({
  indicatorReader,
  getSourcesClient,
}: {
  indicatorReader: Pick<IndicatorReader, 'getQueryLinks' | 'getFeatures'>;
  getSourcesClient: () => Promise<SourcesClient>;
}): KnowledgeIndicatorReader => ({
  listQueryKnowledgeIndicators: async () => {
    // Enabled and disabled: a disabled source's knowledge indicators are still reported, while a
    // source missing from the catalog was deleted, and its leftovers are not.
    const sources = await listAllSources(await getSourcesClient());
    const sourceEnabledById = new Map(sources.map(({ id, enabled }) => [id, enabled]));
    const links = await indicatorReader.getQueryLinks([...sourceEnabledById.keys()], {
      ruleUnbacked: 'include',
    });

    // The read stops at its limit without saying so. A caller that deletes what is missing from
    // the list, such as a rule reconciler, must never see a partial one.
    if (links.length >= REVISION_SIZE_LIMIT) {
      throw new Error(
        `The space has ${REVISION_SIZE_LIMIT} or more query knowledge indicators, more than one read returns`
      );
    }

    return links.flatMap(({ query, source_id: sourceId, expires_at: expiresAt }) => {
      const isSourceEnabled = sourceEnabledById.get(sourceId);
      if (isSourceEnabled === undefined) {
        return [];
      }

      return [
        {
          id: query.id,
          source_id: sourceId,
          source_enabled: isSourceEnabled,
          title: query.title,
          description: query.description,
          esql: query.esql.query,
          severity_score: query.severity_score,
          query_type: deriveQueryType(query.esql.query),
          feature_ids: (query.features ?? []).map(({ id }) => id),
          expires_at: expiresAt,
        },
      ];
    });
  },

  listFeatures: async ({ sourceIds, types }) => {
    // An empty type list would lift the type filter and return every feature.
    if (types.length === 0) {
      return [];
    }

    const { hits } = await indicatorReader.getFeatures(sourceIds, { type: types });

    return hits.map(({ id, source_id: sourceId, type, subtype, title, properties, filter }) => ({
      id,
      source_id: sourceId,
      type,
      subtype,
      title,
      properties,
      filter,
    }));
  },
});
