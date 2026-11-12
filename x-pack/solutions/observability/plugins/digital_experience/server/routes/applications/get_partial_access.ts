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

const splitPatterns = (indices: string[], ignoredPatterns: string[]): string[] => [
  ...new Set(
    indices
      .flatMap((index) => index.split(','))
      .map((pattern) => pattern.trim())
      .filter(
        (pattern) =>
          pattern.length > 0 && !pattern.startsWith('-') && !ignoredPatterns.includes(pattern)
      )
  ),
];

/**
 * Whether the user can't read every open index, alias or data stream behind `indices`.
 * Elasticsearch skips the indices of a wildcard the user can't read instead of failing the search,
 * so this is the only way to notice. Any error means full access, as with security disabled, and
 * never fails the request.
 */
export const hasPartialReadAccess = async ({
  esClient,
  internalEsClient,
  getIndices,
  ignoredPatterns = [],
  logger,
}: {
  /** Client of the current user, which `hasPrivileges` checks. */
  esClient: ElasticsearchClient;
  /** Internal client, which lists the indices whatever the user can read. */
  internalEsClient: ElasticsearchClient;
  /** The source's index patterns, each possibly a comma-separated list. */
  getIndices: () => Promise<string[]>;
  /** Patterns the source's search finds no rows in, left out of the check. */
  ignoredPatterns?: string[];
  logger: Logger;
}): Promise<boolean> => {
  try {
    const patterns = splitPatterns(await getIndices(), ignoredPatterns);
    if (patterns.length === 0) {
      return false;
    }

    // `hasPrivileges` compares patterns with the role's patterns, so it gets the concrete names:
    // a role on `traces-*.otel-production` reads every existing `traces-*.otel-*` index when
    // only production ones exist.
    const {
      indices: matchedIndices,
      aliases,
      data_streams: dataStreams,
    } = await internalEsClient.indices.resolveIndex({
      name: patterns.map(excludeAgentBuilderOtelIndices).join(','),
      expand_wildcards: 'open',
      ignore_unavailable: true,
      allow_no_indices: true,
    });
    const names = [...matchedIndices, ...aliases, ...dataStreams].map(({ name }) => name);
    if (names.length === 0) {
      return false;
    }

    const { index } = await esClient.security.hasPrivileges({
      index: [{ names, privileges: ['read'] }],
    });
    return Object.values(index).some((privileges) => !privileges.read);
  } catch (error) {
    logger.debug(`Could not check the read access to the indices: ${describeError(error)}`);
    return false;
  }
};
