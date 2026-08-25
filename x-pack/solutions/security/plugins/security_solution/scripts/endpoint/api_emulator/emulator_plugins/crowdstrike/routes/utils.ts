/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const buildCrowdstrikeRoutePath = (path: string): string => {
  if (!path.startsWith('/')) {
    throw new Error(`'path' must start with '/'!`);
  }

  return path;
};

export const TEST_CID_ID = 'test-cid-id-123456789';
export const TEST_AGENT_ID = 'test-agent-id-123456789';
export const TEST_SESSION_ID = 'test-session-id-123456789';
export const TEST_BATCH_ID = 'test-batch-id-123456789';
export const TEST_CLOUD_REQUEST_ID = 'test-cloud-request-id-123456789';
