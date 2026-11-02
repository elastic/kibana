/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { AgenticInvestigationsPluginStart } from '@kbn/agentic-investigations-plugin/server';
import type { InvestigationRunStatus } from '@kbn/significant-events-schema';

/** Matches the shared list API's bound on its `id` filter. */
const MAX_IDS_PER_READ = 100;

/**
 * Reports the state of each investigation a significant event lists, from the shared
 * investigations API: `pending` while its agent runs, `complete`
 * otherwise. The ids are investigation (conversation) ids. An id the caller cannot read, or that
 * names no investigation (for example a workflow execution id recorded before investigations were
 * conversations), is omitted.
 */
export const resolveInvestigationStatuses = async ({
  agenticInvestigations,
  request,
  investigationIds,
  logger,
}: {
  agenticInvestigations?: Pick<AgenticInvestigationsPluginStart, 'getInvestigationsClient'>;
  request: KibanaRequest;
  investigationIds: string[];
  logger: Logger;
}): Promise<Record<string, InvestigationRunStatus>> => {
  const uniqueIds = [...new Set(investigationIds.filter(Boolean))];

  if (!agenticInvestigations) {
    logger.debug('Agentic investigations not available, cannot resolve investigation statuses');
    return Object.fromEntries(uniqueIds.map((id) => [id, 'unavailable'] as const));
  }

  const client = agenticInvestigations.getInvestigationsClient(request);
  const statuses: Record<string, InvestigationRunStatus> = {};
  for (let start = 0; start < uniqueIds.length; start += MAX_IDS_PER_READ) {
    const chunk = uniqueIds.slice(start, start + MAX_IDS_PER_READ);
    try {
      const { results } = await client.list({ id: chunk, per_page: chunk.length });
      for (const { id, in_progress: inProgress } of results) {
        statuses[id] = inProgress ? 'pending' : 'complete';
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      logger.debug(`Could not resolve investigation statuses: ${reason}`);
      for (const id of chunk) {
        statuses[id] = 'unavailable';
      }
    }
  }
  return statuses;
};
