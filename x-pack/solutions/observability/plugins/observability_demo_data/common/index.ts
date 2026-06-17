/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const PLUGIN_ID = 'observabilityDemoData';

export const SYNTHTRACE_STATUS_API_PATH = '/internal/observability_demo_data/synthtrace/status';
export const SYNTHTRACE_RUN_API_PATH = '/internal/observability_demo_data/synthtrace/run';

export interface SynthtraceConnectionOverride {
  esUrl?: string;
  kibanaUrl?: string;
  username?: string;
  password?: string;
  apiKey?: string;
}

export interface RunSynthtraceRequestBody {
  scenarioId: string;
  from: string;
  to: string;
  clean?: boolean;
  connection?: SynthtraceConnectionOverride;
}

export interface RunSynthtraceResponseBody {
  scenarioId: string;
  eventsIndexed: number;
}
