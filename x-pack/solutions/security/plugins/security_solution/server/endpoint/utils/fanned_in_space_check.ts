/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { METADATA_UNITED_INDEX } from '../../../common/endpoint/constants';

/**
 * Validates that every requested agent is visible in the given space according to the united index.
 *
 * Provenance alone does not bound a fanned-in read, because a space with no routing expression fans
 * out to every project, so the document has to be matched against the active space on the one field
 * it carries (`united.agent.namespaces`). A missing united document means "not visible", which is
 * deliberate and fails closed.
 *
 * This is the same field and rule the endpoint list uses via `buildCpsMetadataFilter`.
 */
export const areFannedInAgentsVisibleInSpace = async ({
  esClient,
  agentIds,
  spaceId,
}: {
  esClient: ElasticsearchClient;
  agentIds: string[];
  spaceId: string;
}): Promise<boolean> => {
  if (agentIds.length === 0) {
    return false;
  }

  const response = await esClient.search({
    index: METADATA_UNITED_INDEX,
    size: agentIds.length,
    _source: false,
    fields: [{ field: 'united.endpoint.agent.id' }],
    query: {
      bool: {
        filter: [
          { terms: { 'united.endpoint.agent.id': agentIds } },
          { term: { 'united.agent.namespaces': spaceId } },
        ],
      },
    },
  });

  const foundIds = new Set<string>();

  for (const hit of response.hits.hits) {
    const ids = hit.fields?.['united.endpoint.agent.id'];
    if (Array.isArray(ids)) {
      for (const id of ids) {
        foundIds.add(id);
      }
    }
  }

  return agentIds.every((id) => foundIds.has(id));
};
