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
import { combineWhere, inPredicate, inSpace, IS_NOT_DELETED } from '../esql_helpers';
import {
  esqlToObjects,
  executeCountQuery,
  executeAndDecodeSource,
  pickLatestPerGroup,
  withSort,
  withWhere,
  type LatestSourceGroupBy,
  type LatestSourceWhereCondition,
} from '../../significant_events/latest_source_query';
import { runEsqlQuery } from '../../significant_events/run_esql_query';
import { ID, KI_TYPE_FEATURE, SOURCE_ID, TYPE } from '../fields';

export const REVISION_SIZE_LIMIT = 10_000;

export interface LatestRevisionCursor {
  sourceId: string;
  type: string;
  id: string;
}

/**
 * Identity of a knowledge indicator revision within a space. The space filter
 * must be applied before this grouping: feature ids are derived from
 * `(source_id, slug)`, so the same source id onboarded in two spaces yields the
 * same `id` in both and one space's revision would otherwise shadow the other's.
 */
const REVISION_GROUP_KEY: LatestSourceGroupBy = [SOURCE_ID, TYPE, ID];

/**
 * Space-scoped access to raw knowledge indicator revisions. Every query starts
 * from `inSpace(space)`; nothing in this class can read another space's data.
 */
export class RevisionReader {
  constructor(
    private readonly esClient: ElasticsearchClient,
    private readonly logger: Logger,
    private readonly space: string
  ) {}

  /** Counts latest revisions, or the distinct values of `distinctColumn` among them. */
  async countLatestRevisions(
    where?: LatestSourceWhereCondition,
    postGroupingWhere?: LatestSourceWhereCondition,
    distinctColumn?: string
  ): Promise<number> {
    let query = esql.from([KNOWLEDGE_INDICATORS_DATA_STREAM], ['_id']).where`${inSpace(
      this.space
    )}`;
    query = withWhere(query, where);
    query = pickLatestPerGroup(query, REVISION_GROUP_KEY);
    query = withWhere(query, postGroupingWhere);
    query = (
      distinctColumn
        ? query.pipe`STATS total = COUNT_DISTINCT(${esql.col(distinctColumn)})`
        : query.pipe`STATS total = COUNT(*)`
    )
      .keep('total')
      .limit(1);

    return executeCountQuery({ esClient: this.esClient, query });
  }

  async fetchLatestRevisions(
    where?: LatestSourceWhereCondition,
    postGroupingWhere?: LatestSourceWhereCondition,
    sort?: ComposerSortShorthand[],
    limit: number = REVISION_SIZE_LIMIT
  ): Promise<StoredKnowledgeIndicator[]> {
    let query = esql.from([KNOWLEDGE_INDICATORS_DATA_STREAM], ['_id', '_source']).where`${inSpace(
      this.space
    )}`;
    query = withWhere(query, where);
    query = pickLatestPerGroup(query, REVISION_GROUP_KEY);
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

  async fetchLatestRevisionsPage({
    where,
    postGroupingWhere,
    asOf,
    after,
    size,
  }: {
    where?: LatestSourceWhereCondition;
    postGroupingWhere?: LatestSourceWhereCondition;
    asOf: string;
    after?: LatestRevisionCursor;
    size: number;
  }): Promise<{ hits: StoredKnowledgeIndicator[]; nextCursor?: LatestRevisionCursor }> {
    if (size < 1 || size >= REVISION_SIZE_LIMIT) {
      throw new Error(`Revision page size must be between 1 and ${REVISION_SIZE_LIMIT - 1}.`);
    }

    const atOrBefore = esql.exp`${esql.col('@timestamp')} <= TO_DATETIME(${esql.str(asOf)})`;
    const afterCursor = after
      ? esql.exp`${esql.col(SOURCE_ID)} > ${esql.str(after.sourceId)}
        OR (${esql.col(SOURCE_ID)} == ${esql.str(after.sourceId)}
          AND ${esql.col(TYPE)} > ${esql.str(after.type)})
        OR (${esql.col(SOURCE_ID)} == ${esql.str(after.sourceId)}
          AND ${esql.col(TYPE)} == ${esql.str(after.type)}
          AND ${esql.col(ID)} > ${esql.str(after.id)})`
      : undefined;
    let query = esql.from([KNOWLEDGE_INDICATORS_DATA_STREAM], ['_id', '_source']).where`${inSpace(
      this.space
    )}`;
    query = withWhere(query, combineWhere(where, atOrBefore, afterCursor));
    query = pickLatestPerGroup(query, REVISION_GROUP_KEY);
    query = withWhere(query, postGroupingWhere);
    query = query
      .sort([SOURCE_ID, 'ASC'], [TYPE, 'ASC'], [ID, 'ASC'])
      .keep('_source')
      .limit(size + 1);

    const { hits } = await executeAndDecodeSource<StoredKnowledgeIndicator>(this.esClient, query);
    if (hits.length <= size) {
      return { hits };
    }

    const page = hits.slice(0, size);
    const last = page[page.length - 1];
    return {
      hits: page,
      nextCursor: {
        sourceId: last['source.id'],
        type: last.type,
        id: last.id,
      },
    };
  }

  /**
   * Returns the distinct source ids whose latest KI revision satisfies
   * `postGroupingWhere`. Aggregates on `source.id` in ES|QL so the
   * `REVISION_SIZE_LIMIT` cap bounds distinct sources rather than distinct KIs;
   * warns if the cap is hit so partial coverage isn't silent.
   */
  async fetchDistinctSourceIds(
    where?: LatestSourceWhereCondition,
    postGroupingWhere?: LatestSourceWhereCondition
  ): Promise<string[]> {
    let query = esql.from([KNOWLEDGE_INDICATORS_DATA_STREAM], ['_id']).where`${inSpace(
      this.space
    )}`;
    query = withWhere(query, where);
    query = pickLatestPerGroup(query, REVISION_GROUP_KEY);
    query = withWhere(query, postGroupingWhere);
    query = query.pipe`STATS __count = COUNT(*) BY sourceId = ${esql.col(SOURCE_ID)}`
      .keep('sourceId')
      .limit(REVISION_SIZE_LIMIT);

    // `runEsqlQuery` (not `queryEsql`) so a not-yet-created data stream yields
    // `[]` instead of throwing — the sweep can run before any KI is written.
    const response = await runEsqlQuery(this.esClient, query.print('basic'));
    if (!response) {
      return [];
    }

    const rows = esqlToObjects<{ sourceId?: unknown }>(response);

    if (rows.length >= REVISION_SIZE_LIMIT) {
      this.logger.warn(
        `Distinct source enumeration hit REVISION_SIZE_LIMIT (${REVISION_SIZE_LIMIT}); some sources with knowledge indicators may be omitted from this result.`
      );
    }

    return rows.map((row) => row.sourceId).filter((id): id is string => typeof id === 'string');
  }

  async fetchLatestFeatures(
    sourceId: string,
    ids: string[]
  ): Promise<StoredFeatureKnowledgeIndicator[]> {
    if (ids.length === 0) return [];
    const where = combineWhere(
      inPredicate(TYPE, [KI_TYPE_FEATURE]),
      inPredicate(SOURCE_ID, [sourceId]),
      inPredicate(ID, ids)
    );
    const docs = await this.fetchLatestRevisions(where, IS_NOT_DELETED);
    return docs.filter(isStoredFeatureKnowledgeIndicator);
  }
}
