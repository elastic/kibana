/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import { PUBLIC_API_VERSION } from '../constants';
import { readSampleWorkflowYaml } from './sample_workflow_yaml';

/** Creates the sample workflow in the current space and returns its id. */
export const installSampleWorkflow = async (fetch: HttpHandler): Promise<string> => {
  const { id } = (await fetch('/api/workflows/workflow', {
    method: 'POST',
    version: PUBLIC_API_VERSION,
    headers: { 'elastic-api-version': PUBLIC_API_VERSION },
    body: JSON.stringify({ yaml: readSampleWorkflowYaml() }),
  })) as { id: string };
  return id;
};

/** Hard-deletes the sample workflow so the next run can install it again. */
export const deleteSampleWorkflow = async (fetch: HttpHandler, id: string): Promise<void> => {
  await fetch(`/api/workflows/workflow/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    version: PUBLIC_API_VERSION,
    headers: { 'elastic-api-version': PUBLIC_API_VERSION },
    query: { force: true },
  });
};
