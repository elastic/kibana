/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import {
  ALERTING_RULE_API_PATH,
  APM_ANOMALY_DETECTION_ENVIRONMENTS_API_PATH,
  APM_ANOMALY_DETECTION_JOBS_API_PATH,
  DEMO_ML_JOB_PREFIX,
  LOGS_INDEX_PATTERN,
  METRICS_INDEX_PATTERN,
  ML_MODULE_API_VERSION,
  ML_MODULE_SETUP_API_PATH,
  SLO_API_PATH,
  SLO_API_VERSION,
  SYNTHTRACE_RUN_API_PATH,
  SYNTHTRACE_STATUS_API_PATH,
} from './constants';
import type { CreateRuleBody, CreateSloBody } from './recommended_config';

export const createRule = (http: HttpStart, body: CreateRuleBody): Promise<unknown> =>
  http.post(ALERTING_RULE_API_PATH, { body: JSON.stringify(body) });

export const createSlo = (http: HttpStart, body: CreateSloBody): Promise<unknown> =>
  http.post(SLO_API_PATH, { version: SLO_API_VERSION, body: JSON.stringify(body) });

export const getApmEnvironments = (http: HttpStart): Promise<{ environments: string[] }> =>
  http.get(APM_ANOMALY_DETECTION_ENVIRONMENTS_API_PATH);

export const createApmAnomalyJobs = (
  http: HttpStart,
  environments: string[]
): Promise<{ jobCreated: boolean }> =>
  http.post(APM_ANOMALY_DETECTION_JOBS_API_PATH, { body: JSON.stringify({ environments }) });

export interface SetupMlModuleBody {
  indexPatternName: string;
  prefix?: string;
  startDatafeed?: boolean;
  jobOverrides?: readonly unknown[];
  datafeedOverrides?: readonly unknown[];
  useDedicatedIndex?: boolean;
  start?: number;
  end?: number;
  query?: object;
}

export const setupMlModule = (
  http: HttpStart,
  moduleId: string,
  body: SetupMlModuleBody
): Promise<unknown> =>
  http.post(`${ML_MODULE_SETUP_API_PATH}/${moduleId}`, {
    version: ML_MODULE_API_VERSION,
    body: JSON.stringify({
      prefix: DEMO_ML_JOB_PREFIX,
      startDatafeed: true,
      jobOverrides: [],
      datafeedOverrides: [],
      useDedicatedIndex: false,
      ...body,
    }),
  });

/** Convenience helpers for demo ML module setup with default index patterns. */
export const setupLogsAnalysisModule = (http: HttpStart): Promise<unknown> =>
  setupMlModule(http, 'logs_ui_analysis', { indexPatternName: LOGS_INDEX_PATTERN });

export const setupLogsCategoriesModule = (http: HttpStart): Promise<unknown> =>
  setupMlModule(http, 'logs_ui_categories', { indexPatternName: LOGS_INDEX_PATTERN });

export const setupMetricsHostsModule = (http: HttpStart): Promise<unknown> =>
  setupMlModule(http, 'metrics_ui_hosts', { indexPatternName: METRICS_INDEX_PATTERN });

export interface SynthtraceConnectionOverride {
  esUrl?: string;
  kibanaUrl?: string;
  username?: string;
  password?: string;
  apiKey?: string;
}

export interface RunSynthtraceBody {
  scenarioId: string;
  from: string;
  to: string;
  clean?: boolean;
  connection?: SynthtraceConnectionOverride;
}

export interface RunSynthtraceResponse {
  scenarioId: string;
  eventsIndexed: number;
}

export type SynthtraceRunPhase = 'installing_packages' | 'generating' | 'indexing';

export type SynthtraceProgressEvent =
  | { type: 'phase'; phase: SynthtraceRunPhase }
  | { type: 'progress'; eventsIndexed: number }
  | { type: 'complete'; eventsIndexed: number }
  | { type: 'error'; message: string };

/**
 * Runs a scenario and consumes the NDJSON progress stream, invoking `onProgress`
 * for each event. Uses the native fetch API (rather than the core HTTP client)
 * so the response body can be read incrementally as it streams in.
 */
export const runSynthtraceStreaming = async (
  http: HttpStart,
  body: RunSynthtraceBody,
  onProgress: (event: SynthtraceProgressEvent) => void
): Promise<RunSynthtraceResponse> => {
  const response = await fetch(http.basePath.prepend(SYNTHTRACE_RUN_API_PATH), {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'kbn-xsrf': 'true',
      'x-elastic-internal-origin': 'Kibana',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok || !response.body) {
    const text = await response.text().catch(() => '');
    let message = `Request failed with status ${response.status}`;
    try {
      message = (JSON.parse(text) as { message?: string }).message ?? message;
    } catch {
      if (text) {
        message = text;
      }
    }
    throw new Error(message);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let eventsIndexed = 0;
  let errorMessage: string | undefined;

  const handleLine = (line: string): void => {
    const trimmed = line.trim();
    if (!trimmed) {
      return;
    }
    const event = JSON.parse(trimmed) as SynthtraceProgressEvent;
    if (event.type === 'progress' || event.type === 'complete') {
      eventsIndexed = event.eventsIndexed;
    }
    if (event.type === 'error') {
      errorMessage = event.message;
    }
    onProgress(event);
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    lines.forEach(handleLine);
  }
  handleLine(buffer);

  if (errorMessage) {
    throw new Error(errorMessage);
  }

  return { scenarioId: body.scenarioId, eventsIndexed };
};

/**
 * Feature-detects the dev-only synthtrace runner plugin. Returns false when the
 * endpoint is absent (e.g. production builds) so the UI can fall back to CLI.
 */
export const checkSynthtraceAvailability = async (http: HttpStart): Promise<boolean> => {
  try {
    const response = await http.get<{ available: boolean }>(SYNTHTRACE_STATUS_API_PATH);
    return Boolean(response?.available);
  } catch {
    return false;
  }
};
