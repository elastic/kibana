/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { forbidden, serverUnavailable } from '@hapi/boom';
import type { ElasticsearchClient } from '@kbn/core/server';
import { getSourceReadTargets, type ISourceReadTargets } from '@kbn/nightshift-shared';

const CANNOT_CHECK = 'Cannot save a source over this query: its data access cannot be checked.';

/**
 * Refuses a query over data the current user cannot read.
 *
 * Engines read a source's data with their own, broader credentials, so the author's access is
 * only ever checked here. Running the query as the user is not enough: a wildcard that spans a
 * readable and an unreadable index succeeds and shows only the readable one. Asking Elasticsearch
 * for `read` on the patterns themselves covers wildcards and indices that do not exist yet.
 *
 * Fails closed: a query that cannot be analyzed, a remote target (which a local privilege check
 * cannot cover) and a query with no index target are all refused. Document and field level
 * security is not visible to this check.
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
    throw forbidden(CANNOT_CHECK);
  }
  if (targets.hasRemote) {
    throw forbidden(
      'Cannot save a source over a remote cluster index: its data access cannot be checked.'
    );
  }
  if (targets.indexPatterns.length === 0) {
    throw forbidden(CANNOT_CHECK);
  }

  let response: Awaited<ReturnType<ElasticsearchClient['security']['hasPrivileges']>>;
  try {
    response = await esClient.security.hasPrivileges({
      index: [{ names: targets.indexPatterns, privileges: ['read'] }],
    });
  } catch (error) {
    throw serverUnavailable(
      `Could not check read access to the source data: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  if (!response.has_all_requested) {
    const unreadable = targets.indexPatterns.filter(
      (pattern) => response.index?.[pattern]?.read !== true
    );
    throw forbidden(
      `You need read access to the data this source reads. Missing access to: ${unreadable.join(
        ', '
      )}.`
    );
  }
};
