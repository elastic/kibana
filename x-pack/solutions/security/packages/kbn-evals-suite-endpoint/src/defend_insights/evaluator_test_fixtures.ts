/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator } from '@kbn/evals';
import type { DefendInsightsDatasetExample, DefendInsightsTaskOutput } from './types';

type EvaluateParams = Parameters<
  Evaluator<DefendInsightsDatasetExample, DefendInsightsTaskOutput>['evaluate']
>[0];

export const AVAST_SVC = 'C:\\Program Files\\Avast Software\\Avast\\AvastSvc.exe';
export const AVAST_UI = 'C:\\Program Files\\Avast Software\\Avast\\AvastUI.exe';
export const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

/** Healthy runs report at least this many events; fixtures seed 3 unique executables. */
export const SEEDED_EVENT_COUNT = 3;

export const output = (
  overrides: Partial<DefendInsightsTaskOutput> = {}
): DefendInsightsTaskOutput => ({
  status: 'succeeded',
  insights: [],
  insightId: 'insight-1',
  eventsContextCount: SEEDED_EVENT_COUNT,
  latencyMs: 10,
  ...overrides,
});

export const insight = (group: string, values: string[]) => ({
  group,
  events: values.map((value, i) => ({ id: `evt-${i}`, endpointId: 'agent-1', value })),
});

export const avExpected: NonNullable<DefendInsightsDatasetExample['output']> = {
  seededEventCount: SEEDED_EVENT_COUNT,
  results: [
    {
      name: 'Avast',
      requiredPaths: [AVAST_SVC],
      optionalPaths: [AVAST_UI],
      excludedPaths: [CHROME],
    },
  ],
};

export const cleanExpected: NonNullable<DefendInsightsDatasetExample['output']> = {
  seededEventCount: SEEDED_EVENT_COUNT,
  results: [],
  benignPaths: [CHROME],
};

export const params = (
  out: DefendInsightsTaskOutput,
  expected?: DefendInsightsDatasetExample['output']
): EvaluateParams => ({
  input: { endpointId: 'eval-agent-di-test', insightType: 'incompatible_antivirus' },
  output: out,
  expected,
  metadata: { exampleName: 'test' },
});
