/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'node:path';

// Test data time range constants
export const PROFILING_TEST_DATES = {
  rangeFrom: '2023-04-18T00:00:00.000Z',
  rangeTo: '2023-04-18T00:00:30.000Z',
} as const;

export const APM_AGENT_POLICY_ID = 'policy-elastic-agent-on-cloud';
export const COLLECTOR_PACKAGE_POLICY_NAME = 'elastic-universal-profiling-collector';
export const SYMBOLIZER_PACKAGE_POLICY_NAME = 'elastic-universal-profiling-symbolizer';
export const esArchiversPath = Path.join(__dirname, 'es_archiver', 'profiling', 'data.json');
export const esResourcesEndpoint = 'api/profiling/setup/es_resources';
