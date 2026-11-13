/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { isNonLocalIndexName } from '@kbn/es-query';
import { describeError } from '../../lib/helpers/errors';

/**
 * The serverless `viewer`/`editor` roles can't read Agent Builder's OTel indices, which the broad
 * OTel wildcards match, so they are left out as in APM Diagnostics.
 *
 * See https://github.com/elastic/kibana/issues/272478
 */
const AGENT_BUILDER_OTEL_EXCLUSIONS: Record<string, string> = {
  'traces-*.otel-*': 'traces-agent_builder.otel-*',
  'logs-*.otel-*': 'logs-agent_builder.otel-*',
};

const excludeAgentBuilderOtelIndices = (pattern: string): string => {
  const exclusion = AGENT_BUILDER_OTEL_EXCLUSIONS[pattern];
  return exclusion ? `${pattern},-${exclusion}` : pattern;
};

const isLocal = (name: string): boolean => !isNonLocalIndexName(name);

/**
 * The index expression the source's search sends: its lists flattened, trimmed and deduplicated
 * into one, as `APMEventClient` does, so an exclusion in any list applies to every pattern before
 * it. Ignored patterns are left out, and so are remote (CCS or CPS) ones, which the internal user
 * can't resolve. An exclusion with no pattern left before it excludes nothing, so it is dropped too.
 */
const toIndexExpression = (indices: string[], ignoredPatterns: string[]): string[] => {
  const patterns = [
    ...new Set(indices.flatMap((list) => list.split(',').map((pattern) => pattern.trim()))),
  ].filter(
    (pattern) => pattern.length > 0 && isLocal(pattern) && !ignoredPatterns.includes(pattern)
  );
  const firstInclusion = patterns.findIndex((pattern) => !pattern.startsWith('-'));
  return firstInclusion === -1
    ? []
    : patterns.slice(firstInclusion).map(excludeAgentBuilderOtelIndices);
};

/**
 * The data a resolved expression reaches: its indices and data streams, a backing index counting
 * as its data stream, and the targets of its aliases. Linked projects, which cross-project search
 * can add to a local pattern, are left out.
 */
const toReachableData = ({
  indices,
  aliases,
  data_streams: dataStreams,
}: estypes.IndicesResolveIndexResponse): Set<string> => {
  const names = [
    ...indices.map(({ name, data_stream: dataStream }) => dataStream ?? name),
    ...dataStreams.map(({ name }) => name),
    ...aliases.flatMap(({ indices: targets }) => (Array.isArray(targets) ? targets : [targets])),
  ];
  return new Set(names.filter(isLocal));
};

/**
 * Whether the user can't read all the data the source's search would read with full access.
 * Elasticsearch skips the names of a wildcard the user can't read instead of failing the search,
 * so the check resolves the search's expression as the internal user and as the user, which
 * Elasticsearch limits to what they can read, and compares the two. Any error means full access,
 * as with security disabled, and never fails the request.
 */
export const hasPartialReadAccess = async ({
  esClient,
  internalEsClient,
  getIndices,
  ignoredPatterns = [],
  signal,
  logger,
}: {
  /** Client of the current user. */
  esClient: ElasticsearchClient;
  /** Internal client, which resolves the expression whatever the user can read. */
  internalEsClient: ElasticsearchClient;
  /** The index lists the source's search sends, in its order; each a comma-separated list. */
  getIndices: () => Promise<string[]>;
  /** Patterns the source's search finds no rows in, left out of the check. */
  ignoredPatterns?: string[];
  signal?: AbortSignal;
  logger: Logger;
}): Promise<boolean> => {
  try {
    const expression = toIndexExpression(await getIndices(), ignoredPatterns);
    if (expression.length === 0) {
      return false;
    }

    const request: estypes.IndicesResolveIndexRequest = {
      name: expression.join(','),
      expand_wildcards: 'open',
      ignore_unavailable: true,
      allow_no_indices: true,
    };
    const [everything, readable] = await Promise.all([
      internalEsClient.indices.resolveIndex(request, { signal }),
      esClient.indices.resolveIndex(request, { signal }),
    ]);

    const readableData = toReachableData(readable);
    return [...toReachableData(everything)].some((name) => !readableData.has(name));
  } catch (error) {
    logger.debug(`Could not check the read access to the indices: ${describeError(error)}`);
    return false;
  }
};
