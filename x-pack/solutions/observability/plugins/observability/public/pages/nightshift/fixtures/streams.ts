/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FixtureStream } from './types';

export const streams: FixtureStream[] = [
  { name: 'logging-gcp-us-central1-logs-agentless-api-log-default', description: 'Production log stream' },
  { name: 'logging-gcp-us-central1-logs-agentless-log-default', description: 'Production log stream' },
  { name: 'logging-gcp-us-central1-logs-all', description: 'Production log stream' },
  { name: 'logging-managed-inputs', description: 'Production log stream' },
  { name: 'logging-motel-ingest-collector', description: 'Production log stream' },
];
