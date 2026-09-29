/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql, type ComposerSortShorthand } from '@elastic/esql';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  KNOWLEDGE_INDICATORS_DATA_STREAM,
  isStoredFeatureKnowledgeIndicator,
  type StoredFeatureKnowledgeIndicator,
  type StoredKnowledgeIndicator,
} from '../data_stream';
import { combineWhere, inPredicate, IS_NOT_DELETED } from '../esql_helpers';
import {
  esqlToObjects,
  executeAndDecodeSource,
  pickLatestPerGroup,
  withSort,
  withWhere,
  type LatestSourceWhereCondition,
} from '../../significant_events/latest_source_query';
import { runEsqlQuery } from '../../significant_events/run_esql_query';
import { ID, KI_TYPE_FEATURE, STREAM_NAME, TYPE } from '../fields';

export const REVISION_SIZE_LIMIT = 10_000;

export class RevisionReader {
  constructor(private readonly esClient: ElasticsearchClient, private readonly logger: Logger) {}

  async fetchLatestRevisions(
    where?: LatestSourceWhereCondition,
    postGroupingWhere?: LatestSourceWhereCondition,
    sort?: ComposerSortShorthand[],
    limit: number = REVISION_SIZE_LIMIT
  ): Promise<StoredKnowledgeIndicator[]> {
    let query = esql.from([KNOWLEDGE_INDICATORS_DATA_STREAM], ['_id', '_source']);
    query = withWhere(query, where);
    query = pickLatestPerGroup(query, ['stream.name', 'type', 'id']);
    query = withWhere(query, postGroupingWhere);
    query = withSort(query, sort);
    // Cap at REVISION_SIZE_LIMIT regardless of the requested limit so a large
    // caller-supplied value can't fetch an unbounded result set.
    if (limit > REVISION_SIZE_LIMIT) {
      this.logger.debug(
        `Requested revision limit ${limit} exceeds REVISION_SIZE_LIMIT ${REVISION_SIZE_LIMIT}; capping at ${REVISION_SIZE_LIMIT}.`
      );
    }
    query = query.keep('_source').limit(Math.min(limit, REVISION_SIZE_LIMIT));

    const { hits } = await executeAndDecodeSource<StoredKnowledgeIndicator>(this.esClient, query);
    return hits;
  }

  /**
   * Returns the distinct stream names whose latest KI revision satisfies
   * `postGroupingWhere`. Aggregates on `stream.name` in ES|QL so the
   * `REVISION_SIZE_LIMIT` cap bounds distinct streams rather than distinct KIs;
   * warns if the cap is hit so partial coverage isn't silent.
   */
  async fetchDistinctStreamNames(
    where?: LatestSourceWhereCondition,
    postGroupingWhere?: LatestSourceWhereCondition
  ): Promise<string[]> {
    let query = esql.from([KNOWLEDGE_INDICATORS_DATA_STREAM], ['_id']);
    query = withWhere(query, where);
    query = pickLatestPerGroup(query, ['stream.name', 'type', 'id']);
    query = withWhere(query, postGroupingWhere);
    query = query.pipe`STATS __count = COUNT(*) BY streamName = ${esql.col(STREAM_NAME)}`
      .keep('streamName')
      .limit(REVISION_SIZE_LIMIT);

    // `runEsqlQuery` (not `queryEsql`) so a not-yet-created data stream yields
    // `[]` instead of throwing — the sweep can run before any KI is written.
    const response = await runEsqlQuery(this.esClient, query.print('basic'));
    if (!response) {
      return [];
    }

    const rows = esqlToObjects<{ streamName?: unknown }>(response);

    if (rows.length >= REVISION_SIZE_LIMIT) {
      this.logger.warn(
        `Distinct stream enumeration hit REVISION_SIZE_LIMIT (${REVISION_SIZE_LIMIT}); some streams with knowledge indicators may be omitted from this result.`
      );
    }

    return rows
      .map((row) => row.streamName)
      .filter((name): name is string => typeof name === 'string');
  }

  async fetchLatestFeatures(
    stream: string,
    ids: string[]
  ): Promise<StoredFeatureKnowledgeIndicator[]> {
    if (ids.length === 0) return [];
    const where = combineWhere(
      inPredicate(TYPE, [KI_TYPE_FEATURE]),
      inPredicate(STREAM_NAME, [stream]),
      inPredicate(ID, ids)
    );
    const docs = await this.fetchLatestRevisions(where, IS_NOT_DELETED);
    return docs.filter(isStoredFeatureKnowledgeIndicator);
  }
}
