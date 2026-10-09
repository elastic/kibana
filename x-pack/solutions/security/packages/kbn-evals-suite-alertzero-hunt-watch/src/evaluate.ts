/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one or more
 * contributor license agreements. Licensed under the Elastic License 2.0.
 */

import { evaluate as base } from '@kbn/evals';

const INTERNAL_API_HEADERS = {
  'elastic-api-version': '1',
  'x-elastic-internal-origin': 'Kibana',
};

export interface HuntWatchFixtures {
  request: ReturnType<typeof base> extends never ? never : { post: never };
}

/**
 * Extends the base @kbn/evals fixture with the internal API surface the Hunt
 * Watch suite drives: the production threat-report ingest route, the candidates
 * route, and the Worker manual trigger.
 */
export const evaluate = base;
export { INTERNAL_API_HEADERS };

// Route surface used by the harness (paths inlined like the template suite).
export const ROUTES = {
  ingestThreatReport: '/internal/threat_intel/ingest_threat_report',
  candidates: '/internal/alertzero/hunt/candidates',
  huntCoordinator: '/internal/alertzero/hunt/hunt_coordinator',
} as const;
