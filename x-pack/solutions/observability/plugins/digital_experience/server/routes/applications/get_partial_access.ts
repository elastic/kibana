/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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

/**
 * One resolvable expression per distinct list, as an exclusion only applies to the patterns before
 * it in its own list. Ignored and remote (CCS or CPS) patterns are left out, as local `hasPrivileges`
 * doesn't see the `remote_indices` that grant their reads; a list with only exclusions left is dropped.
 */
const toExpressions = (indices: string[], ignoredPatterns: string[]): string[] => {
  const expressions = [...new Set(indices)].flatMap((list) => {
    const patterns = list
      .split(',')
      .map((pattern) => pattern.trim())
      .filter(
        (pattern) =>
          pattern.length > 0 && !isNonLocalIndexName(pattern) && !ignoredPatterns.includes(pattern)
      );
    if (patterns.every((pattern) => pattern.startsWith('-'))) {
      return [];
    }
    return [patterns.map(excludeAgentBuilderOtelIndices).join(',')];
  });
  return [...new Set(expressions)];
};

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
  /** The source's index lists, each a comma-separated list that may hold exclusions. */
  getIndices: () => Promise<string[]>;
  /** Patterns the source's search finds no rows in, left out of the check. */
  ignoredPatterns?: string[];
  logger: Logger;
}): Promise<boolean> => {
  try {
    const expressions = toExpressions(await getIndices(), ignoredPatterns);
    if (expressions.length === 0) {
      return false;
    }

    // `hasPrivileges` compares patterns with the role's patterns, so it gets the concrete names:
    // a role on `traces-*.otel-production` reads every existing `traces-*.otel-*` index when
    // only production ones exist.
    const resolved = await Promise.all(
      expressions.map((name) =>
        internalEsClient.indices.resolveIndex({
          name,
          expand_wildcards: 'open',
          ignore_unavailable: true,
          allow_no_indices: true,
        })
      )
    );
    const names = [
      ...new Set(
        resolved
          .flatMap(({ indices, aliases, data_streams: dataStreams }) => [
            ...indices,
            ...aliases,
            ...dataStreams,
          ])
          .map(({ name }) => name)
          .filter((name) => !isNonLocalIndexName(name))
      ),
    ];
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
