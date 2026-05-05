/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';

export interface WorkflowNameId {
  readonly id: string;
  readonly name: string;
}

/** Picks the workflow id whose display name equals `exactWorkflowName` (search may return multiple rows). */
export const findWorkflowIdByExactName = (
  results: readonly WorkflowNameId[],
  exactWorkflowName: string
): string | undefined => results.find((item) => item.name === exactWorkflowName)?.id;

export const resolveWorkflowIdByExactName = async ({
  workflowApi,
  spaceId,
  exactWorkflowName,
  searchQuery,
}: {
  workflowApi: WorkflowsServerPluginSetup['management'];
  spaceId: string;
  exactWorkflowName: string;
  searchQuery: string;
}): Promise<string | undefined> => {
  const list = await workflowApi.getWorkflows(
    {
      query: searchQuery,
      size: 20,
      page: 1,
    },
    spaceId
  );
  return findWorkflowIdByExactName(list.results, exactWorkflowName);
};
