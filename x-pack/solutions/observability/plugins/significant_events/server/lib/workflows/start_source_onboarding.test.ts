/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { httpServerMock } from '@kbn/core/server/mocks';
import {
  assessSourceSampling,
  type SourceSamplingAssessment,
} from '../significant_events/features/assess_source_sampling';
import { startSourceOnboarding } from './start_source_onboarding';

jest.mock('../significant_events/features/assess_source_sampling');

const start = (assessment: SourceSamplingAssessment, skipFeatures = false) => {
  jest.mocked(assessSourceSampling).mockResolvedValue(assessment);
  const run = jest.fn().mockResolvedValue({ executionId: 'execution-id' });
  const result = startSourceOnboarding({
    source: { view_name: '$.nightshift.sources.default.nginx' },
    inputs: {
      sourceId: 'source-id',
      features: { skip: skipFeatures, start: 1000, end: 2000 },
      queries: { skip: false },
    },
    onboardingClient: { run },
    esClient: {} as never,
    request: httpServerMock.createKibanaRequest(),
    logger: loggerMock.create(),
  });
  return { result, run };
};

describe('startSourceOnboarding', () => {
  it.each<[string, SourceSamplingAssessment, string]>([
    ['cannot be sampled', { kind: 'unsupported', reason: 'no @timestamp' }, 'no @timestamp'],
    [
      'holds no document in the features window',
      { kind: 'empty' },
      'The source holds no document between 1970-01-01T00:00:01.000Z and 1970-01-01T00:00:02.000Z.',
    ],
  ])('refuses a source that %s', async (_, assessment, reason) => {
    const { result, run } = start(assessment);

    await expect(result).resolves.toEqual({ kind: 'refused', reason });
    expect(run).not.toHaveBeenCalled();
  });

  it('starts the run when the probe cannot answer', async () => {
    const { result } = start({ kind: 'unknown', error: 'timed out' });

    await expect(result).resolves.toEqual({ kind: 'started', executionId: 'execution-id' });
  });

  it('starts a run that skips feature identification', async () => {
    const { result } = start({ kind: 'empty' }, true);

    await expect(result).resolves.toEqual({ kind: 'started', executionId: 'execution-id' });
  });
});
