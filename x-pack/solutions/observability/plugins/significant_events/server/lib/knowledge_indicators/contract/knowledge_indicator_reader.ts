/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Feature, QueryLink } from '@kbn/significant-events-schema';
import type { IndicatorReader } from '../knowledge_indicator_client/indicator_reader';
import { REVISION_SIZE_LIMIT } from '../knowledge_indicator_client/revision_reader';

/**
 * Reads the knowledge indicators of one space. Read-only: other plugins never write knowledge
 * indicators through this contract. The caller picks the sources; the reader does not check that
 * they exist or are enabled.
 */
export interface KnowledgeIndicatorReader {
  /**
   * The live query knowledge indicators of the given sources, rule-backed or not. Deleted and
   * expired ones are left out. No sources gives no links. Throws when the read reaches its limit
   * (10,000) rather than return part of them.
   */
  listQueryLinks(params: { sourceIds: string[] }): Promise<QueryLink[]>;
  /**
   * The live features of the given sources, of the given types (`entity`, `dependency`, ...).
   * Deleted, expired and excluded ones are left out. No types gives no features. Returns at most
   * 10,000, most confident first, and does not throw past that: a caller missing a feature has to
   * fall back to the source.
   */
  listFeatures(params: { sourceIds: string[]; types: string[] }): Promise<Feature[]>;
}

/** Builds the reader on the plugin's own knowledge indicator reads. */
export const createKnowledgeIndicatorReader = ({
  indicatorReader,
}: {
  indicatorReader: Pick<IndicatorReader, 'getQueryLinks' | 'getFeatures'>;
}): KnowledgeIndicatorReader => ({
  listQueryLinks: async ({ sourceIds }) => {
    if (sourceIds.length === 0) {
      return [];
    }

    const links = await indicatorReader.getQueryLinks(sourceIds, { ruleUnbacked: 'include' });

    // The read stops at its limit without saying so. A caller that deletes what is missing from
    // the list, such as a rule reconciler, must never see a partial one.
    if (links.length >= REVISION_SIZE_LIMIT) {
      throw new Error(
        `The sources have ${REVISION_SIZE_LIMIT} or more query knowledge indicators, more than one read returns`
      );
    }

    return links;
  },

  listFeatures: async ({ sourceIds, types }) => {
    // An empty type list would lift the type filter and return every feature.
    if (types.length === 0) {
      return [];
    }

    const { hits } = await indicatorReader.getFeatures(sourceIds, { type: types });
    return hits;
  },
});
