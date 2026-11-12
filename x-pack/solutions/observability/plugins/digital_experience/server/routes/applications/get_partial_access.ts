/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { describeError } from '../../lib/helpers/errors';

/**
 * The serverless `viewer`/`editor` roles can't read Agent Builder's OTel indices, which the broad
 * OTel wildcards match, and `hasPrivileges` is `false` for a wildcard unless every match is readable.
 */
const AGENT_BUILDER_OTEL_EXCLUSIONS: Record<string, string> = {
  'traces-*.otel-*': 'traces-agent_builder.otel-*',
  'logs-*.otel-*': 'logs-agent_builder.otel-*',
};

const excludeAgentBuilderOtelIndices = (pattern: string): string => {
  const exclusion = AGENT_BUILDER_OTEL_EXCLUSIONS[pattern];
  return exclusion ? `${pattern},-${exclusion}` : pattern;
};

const splitPatterns = (indices: string[]): string[] => [
  ...new Set(
    indices
      .flatMap((index) => index.split(','))
      .map((pattern) => pattern.trim())
      .filter((pattern) => pattern.length > 0 && !pattern.startsWith('-'))
  ),
];

/**
 * Whether the user can't read every index behind `indices`. Elasticsearch skips the indices of a
 * wildcard the user can't read instead of failing the search, so this is the only way to notice.
 * Only patterns that match an existing index, alias or data stream are checked, so an unused
 * default pattern such as `apm-*` doesn't count. Any error means full access, as with security
 * disabled, and never fails the request.
 */
export const hasPartialReadAccess = async ({
  esClient,
  internalEsClient,
  indices,
  logger,
}: {
  /** Client of the current user, which `hasPrivileges` checks. */
  esClient: ElasticsearchClient;
  /** Internal client, which resolves the patterns whatever the user can read. */
  internalEsClient: ElasticsearchClient;
  /** Index patterns, each possibly a comma-separated list. */
  indices: string[];
  logger: Logger;
}): Promise<boolean> => {
  try {
    const patterns = splitPatterns(indices);

    const resolved = await Promise.all(
      patterns.map(async (pattern) => {
        const {
          indices: matchedIndices,
          aliases,
          data_streams: dataStreams,
        } = await internalEsClient.indices.resolveIndex({
          name: pattern,
          expand_wildcards: 'all',
          ignore_unavailable: true,
          allow_no_indices: true,
        });
        return matchedIndices.length + aliases.length + dataStreams.length > 0;
      })
    );
    const existing = patterns.filter((_, index) => resolved[index]);
    if (existing.length === 0) {
      return false;
    }

    const { index } = await esClient.security.hasPrivileges({
      index: [{ names: existing.map(excludeAgentBuilderOtelIndices), privileges: ['read'] }],
    });
    return Object.values(index).some((privileges) => !privileges.read);
  } catch (error) {
    logger.debug(
      `Could not check the read access to ${indices.join(', ')}: ${describeError(error)}`
    );
    return false;
  }
};
