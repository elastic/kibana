/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_SOURCES_PER_PAGE } from '@kbn/nightshift-shared';
import { hasSameEsql } from '@kbn/streams-schema';
import { RECOMMENDED_SOURCES, type RecommendedSource } from '../../common/recommended_sources';
import type { SourcesClient } from './sources_client';

export class SourcesRecommendationService {
  constructor(private readonly sourcesClient: Pick<SourcesClient, 'list'>) {}

  async list(): Promise<RecommendedSource[]> {
    const existingEsql: string[] = [];
    let sourceCount = 0;

    for (let page = 1; ; page++) {
      const { sources, total } = await this.sourcesClient.list({
        page,
        perPage: MAX_SOURCES_PER_PAGE,
      });
      existingEsql.push(...sources.map(({ esql }) => esql));
      sourceCount += sources.length;
      if (sources.length < MAX_SOURCES_PER_PAGE || sourceCount >= total) {
        break;
      }
    }

    return RECOMMENDED_SOURCES.filter(
      (preset) => !existingEsql.some((esql) => hasSameEsql(esql, preset.esql))
    );
  }
}
