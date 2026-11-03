/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Boom, forbidden, isBoom } from '@hapi/boom';
import type { ElasticsearchClient } from '@kbn/core/server';
import { isResponseError } from '@kbn/es-errors';
import { getSourceReadTargets, type ISourceReadTargets } from '@kbn/nightshift-shared';
import { toBoom } from './es_errors';

const UNPARSEABLE_QUERY = 'This query could not be analyzed, so its data access cannot be checked.';
const NO_INDEX_TARGET =
  'This query has no FROM or TS index target, so its data access cannot be checked.';
const PRIVILEGE_CHECK_FAILED = 'Could not check read access to the source data';

/**
 * Keeps the status Elasticsearch answered with, mapped like every other ES error here (a 401
 * becomes a 500, so it cannot pass for an expired Kibana session). The message is fixed: an ES
 * reason or a transport failure can carry backend detail the caller should not see.
 */
const toPrivilegeCheckError = (error: unknown): Boom => {
  const mapped = isResponseError(error) ? toBoom(error) : undefined;
  return new Boom(PRIVILEGE_CHECK_FAILED, {
    statusCode: isBoom(mapped) ? mapped.output.statusCode : 503,
  });
};

/**
 * Refuses a query over data the current user cannot read.
 *
 * Engines read a source's data with their own, broader credentials, so the author's access is
 * only ever checked here. Running the query as the user is not enough: a wildcard that spans a
 * readable and an unreadable index succeeds and shows only the readable one. Asking Elasticsearch
 * for `read` on the patterns themselves covers wildcards and indices that do not exist yet.
 *
 * Remote cluster targets (`cluster:index`) are skipped: `has_privileges` only covers local
 * indices, so their access cannot be assessed and is assumed. A query that targets only remote
 * clusters therefore passes. Fails closed on everything else: a query that cannot be analyzed and
 * a query with no index target are refused. Document and field level security is not visible to
 * this check.
 */
export const assertUserCanReadSourceQuery = async ({
  esClient,
  esql,
}: {
  esClient: ElasticsearchClient;
  esql: string;
}): Promise<void> => {
  let targets: ISourceReadTargets;
  try {
    targets = getSourceReadTargets(esql);
  } catch {
    // Defensive: structural validation answers 400 first, so this is only reachable when the
    // function is called on its own. Keeps it fail-closed there.
    throw forbidden(UNPARSEABLE_QUERY);
  }
  if (targets.indexPatterns.length === 0) {
    if (targets.hasRemote) {
      return;
    }
    throw forbidden(NO_INDEX_TARGET);
  }

  let response: Awaited<ReturnType<ElasticsearchClient['security']['hasPrivileges']>>;
  try {
    response = await esClient.security.hasPrivileges({
      index: [{ names: targets.indexPatterns, privileges: ['read'] }],
    });
  } catch (error) {
    throw toPrivilegeCheckError(error);
  }

  if (!response.has_all_requested) {
    const unreadable = targets.indexPatterns
      .filter((pattern) => response.index?.[pattern]?.read !== true)
      .map((pattern) => `\`${pattern}\``);
    throw forbidden(
      `You need read access to the data this source reads. Missing access to: ${unreadable.join(
        ', '
      )}`
    );
  }
};
