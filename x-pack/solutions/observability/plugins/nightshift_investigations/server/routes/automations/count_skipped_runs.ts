/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { KibanaRequest } from '@kbn/core/server';
import { SKIP_REASONS } from './map_run_status';

export const TRIGGER_STEP_IDS = [
  'trigger_investigation',
  'trigger_alert_investigation',
  'trigger_investigation_alert',
  'trigger_investigation_slack',
  'follow_up_recovered_alert',
  'trigger_investigation_alert_v2',
  'follow_up_recovered_alert_v2',
];

const PAGE_SIZE = 1000;

interface StepSearch {
  searchStepExecutions: (
    params: {
      workflowId: string;
      stepId: string[];
      includeOutput: boolean;
      sourceIncludes: string[];
      size: number;
      searchAfter?: estypes.SortResults;
      startedAfter?: string;
      request: KibanaRequest;
    },
    spaceId: string
  ) => Promise<{
    results: Array<{ workflowRunId: string; output?: unknown }>;
    total: number;
    searchAfter?: estypes.SortResults;
  }>;
}

const hasSkipReason = (output: unknown) =>
  typeof output === 'object' &&
  output !== null &&
  SKIP_REASONS.some((reason) => reason === (output as Record<string, unknown>).skip_reason);

export const getSkippedRunIds = async ({
  management,
  workflowId,
  startedAfter,
  request,
  spaceId,
}: {
  management: StepSearch;
  workflowId: string;
  startedAfter?: string;
  request: KibanaRequest;
  spaceId: string;
}): Promise<string[]> => {
  const skippedRunIds = new Set<string>();
  let searchAfter: estypes.SortResults | undefined;
  do {
    const { results, searchAfter: nextSearchAfter } = await management.searchStepExecutions(
      {
        workflowId,
        stepId: TRIGGER_STEP_IDS,
        includeOutput: true,
        sourceIncludes: ['workflowRunId', 'output.skip_reason'],
        size: PAGE_SIZE,
        searchAfter,
        startedAfter,
        request,
      },
      spaceId
    );
    for (const { workflowRunId, output } of results) {
      if (hasSkipReason(output)) skippedRunIds.add(workflowRunId);
    }
    searchAfter = nextSearchAfter;
  } while (searchAfter);
  return [...skippedRunIds];
};
