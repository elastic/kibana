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
 * The index expression the source's search sends: its lists flattened, trimmed and deduplicated
 * into one, as `APMEventClient` does, so an exclusion in any list applies to every pattern before
 * it. Ignored patterns are left out, and so are remote (CCS or CPS) ones, as local `hasPrivileges`
 * doesn't see the `remote_indices` that grant their reads. An exclusion with no pattern left
 * before it excludes nothing, so it is dropped too.
 */
const toIndexExpression = (indices: string[], ignoredPatterns: string[]): string[] => {
  const patterns = [
    ...new Set(indices.flatMap((list) => list.split(',').map((pattern) => pattern.trim()))),
  ].filter(
    (pattern) =>
      pattern.length > 0 && !isNonLocalIndexName(pattern) && !ignoredPatterns.includes(pattern)
  );
  const firstInclusion = patterns.findIndex((pattern) => !pattern.startsWith('-'));
  return firstInclusion === -1
    ? []
    : patterns.slice(firstInclusion).map(excludeAgentBuilderOtelIndices);
};

const toArray = (names: string | string[]): string[] => (Array.isArray(names) ? names : [names]);

const isLocal = (name: string): boolean => !isNonLocalIndexName(name);

/**
 * Whether the user can't read every open index or data stream behind `indices`. Elasticsearch
 * skips the names of a wildcard the user can't read instead of failing the search, so this is the
 * only way to notice. The search reads a target directly when the expression matches it, and
 * through any alias the expression matches, so the target is readable when either is. Any error
 * means full access, as with security disabled, and never fails the request.
 */
export const hasPartialReadAccess = async ({
  esClient,
  internalEsClient,
  getIndices,
  ignoredPatterns = [],
  signal,
  logger,
}: {
  /** Client of the current user, which `hasPrivileges` checks. */
  esClient: ElasticsearchClient;
  /** Internal client, which lists the indices whatever the user can read. */
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

    // `hasPrivileges` compares patterns with the role's patterns, so it gets the concrete names:
    // a role on `traces-*.otel-production` reads every existing `traces-*.otel-*` index when
    // only production ones exist.
    const resolved = await internalEsClient.indices.resolveIndex(
      {
        name: expression.join(','),
        expand_wildcards: 'open',
        ignore_unavailable: true,
        allow_no_indices: true,
      },
      { signal }
    );
    // Cross-project search can resolve a local pattern to linked projects, which local
    // `hasPrivileges` doesn't cover either; backing indices are read through their data stream.
    const matched = [
      ...resolved.indices.filter(({ data_stream: dataStream }) => !dataStream),
      ...resolved.data_streams,
    ]
      .map(({ name }) => name)
      .filter(isLocal);
    const aliases = resolved.aliases.filter(({ name }) => isLocal(name));

    const aliasesByTarget = new Map<string, string[]>();
    aliases.forEach(({ name, indices: aliasTargets }) => {
      toArray(aliasTargets).forEach((target) => {
        aliasesByTarget.set(target, [...(aliasesByTarget.get(target) ?? []), name]);
      });
    });
    const targets = new Set([...matched, ...aliasesByTarget.keys()]);
    if (targets.size === 0) {
      return false;
    }

    const { index: privileges } = await esClient.security.hasPrivileges(
      {
        index: [
          {
            names: [...new Set([...matched, ...aliases.map(({ name }) => name)])],
            privileges: ['read'],
          },
        ],
      },
      { signal }
    );
    const canRead = (name: string): boolean => privileges[name]?.read === true;
    const directlyMatched = new Set(matched);
    return [...targets].some(
      (target) =>
        !(directlyMatched.has(target) && canRead(target)) &&
        !(aliasesByTarget.get(target) ?? []).some(canRead)
    );
  } catch (error) {
    logger.debug(`Could not check the read access to the indices: ${describeError(error)}`);
    return false;
  }
};
