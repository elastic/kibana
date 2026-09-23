/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@elastic/esql';
import type { TimeState } from '@kbn/es-query';
import { getSourcesForStream, type Streams } from '@kbn/streams-schema';
import { conditionToESQLAst, type Condition } from '@kbn/streamlang';
import type { TimeRange } from '@kbn/es-query';

export function buildDiscoverParams(esqlQuery: string, timeRange: TimeRange) {
  return {
    timeRange: {
      from: timeRange.from,
      to: timeRange.to,
    },
    query: {
      esql: esqlQuery,
    },
    interval: 'auto',
  };
}

export function buildFeatureDiscoverParams(
  stream: Streams.all.Definition,
  filter: Condition,
  timeState: TimeState
) {
  const sources = getSourcesForStream(stream);
  const query = esql.from(sources).pipe`WHERE ${conditionToESQLAst(filter)}`;
  query.addSetCommand('unmapped_fields', 'LOAD');

  return {
    timeRange: {
      from: timeState.timeRange.from,
      to: timeState.timeRange.to,
    },
    query: {
      esql: query.print('basic'),
    },
    interval: 'auto',
  };
}
