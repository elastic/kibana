/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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

const PAGE_SIZE = 100;

interface StepSearch {
  searchStepExecutions: (
    params: {
      workflowId: string;
      stepId: string[];
      includeOutput: boolean;
      sourceIncludes: string[];
      page: number;
      size: number;
      startedAfter?: string;
      startedBefore?: string;
      request: KibanaRequest;
    },
    spaceId: string
  ) => Promise<{
    results: Array<{ workflowRunId: string; output?: unknown }>;
    total: number;
  }>;
}

const hasSkipReason = (output: unknown) =>
  typeof output === 'object' &&
  output !== null &&
  SKIP_REASONS.some((reason) => reason === (output as Record<string, unknown>).skip_reason);

export const countSkippedRuns = async ({
  management,
  workflowId,
  startedAfter,
  startedBefore,
  request,
  spaceId,
}: {
  management: StepSearch;
  workflowId: string;
  startedAfter?: string;
  startedBefore?: string;
  request: KibanaRequest;
  spaceId: string;
}): Promise<number> => {
  const skippedRunIds = new Set<string>();
  let page = 1;
  let total = 0;
  do {
    const { results, total: stepTotal } = await management.searchStepExecutions(
      {
        workflowId,
        stepId: TRIGGER_STEP_IDS,
        includeOutput: true,
        sourceIncludes: ['workflowRunId', 'output'],
        page,
        size: PAGE_SIZE,
        startedAfter,
        startedBefore,
        request,
      },
      spaceId
    );
    total = stepTotal;
    for (const { workflowRunId, output } of results) {
      if (hasSkipReason(output)) skippedRunIds.add(workflowRunId);
    }
    page++;
  } while ((page - 1) * PAGE_SIZE < total);
  return skippedRunIds.size;
};
