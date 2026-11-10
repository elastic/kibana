/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApplicationStart } from '@kbn/core-application-browser';
import { WORKFLOWS_APP_ID } from '@kbn/deeplinks-workflows';

/**
 * Deep-link to a managed Worker workflow execution. AlertZero installs Workers as
 * `{workerId}-{spaceId}`; `source_watch` on an SSE is that worker id, and `run_id` is
 * the workflow execution id.
 */
export const buildWorkflowExecutionUrl = ({
  getUrlForApp,
  workerId,
  spaceId,
  executionId,
}: {
  getUrlForApp?: ApplicationStart['getUrlForApp'];
  workerId: string;
  spaceId: string;
  executionId: string;
}): string | undefined => {
  if (!getUrlForApp || !workerId || !spaceId || !executionId) {
    return undefined;
  }

  const workflowId = `${workerId}-${spaceId}`;
  const href = getUrlForApp(WORKFLOWS_APP_ID, {
    path: `/${encodeURIComponent(workflowId)}?tab=executions&executionId=${encodeURIComponent(
      executionId
    )}`,
  });
  return href.length > 0 ? href : undefined;
};
