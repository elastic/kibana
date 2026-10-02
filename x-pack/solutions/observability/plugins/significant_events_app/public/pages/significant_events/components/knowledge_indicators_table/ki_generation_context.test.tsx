/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { NIGHTSHIFT_DEFAULT_MODELS } from '@kbn/significant-events-schema';
import { KiGenerationProvider, useKiGeneration } from './ki_generation_context';

const mockBulkOnboarding = {
  isScheduling: false,
  cancelOnboarding: jest.fn(),
  bulkScheduleOnboarding: jest.fn().mockResolvedValue([]),
  bulkOnboardAll: jest.fn().mockResolvedValue([]),
  bulkOnboardFeaturesOnly: jest.fn().mockResolvedValue([]),
  bulkOnboardQueriesOnly: jest.fn().mockResolvedValue([]),
  onboardingStatusUpdateQueue: { add: jest.fn() },
  processStatusUpdateQueue: jest.fn().mockResolvedValue(undefined),
};

jest.mock('../../hooks/use_fetch_streams', () => ({
  useFetchStreams: () => ({ data: { streams: [] }, isLoading: false }),
}));

jest.mock('../../hooks/use_bulk_onboarding', () => ({
  useBulkOnboarding: () => mockBulkOnboarding,
}));

const ContextProbe = () => {
  const { onboardingConfig, featuresConnectors, queriesConnectors } = useKiGeneration();

  return (
    <>
      <div data-test-subj="features-connector">{onboardingConfig.connectors.features}</div>
      <div data-test-subj="queries-connector">{onboardingConfig.connectors.queries}</div>
      <div data-test-subj="features-loading">{String(featuresConnectors.loading)}</div>
      <div data-test-subj="queries-loading">{String(queriesConnectors.loading)}</div>
    </>
  );
};

describe('KiGenerationProvider model defaults', () => {
  it('uses the static Nightshift defaults without a loading state', async () => {
    render(
      <KiGenerationProvider>
        <ContextProbe />
      </KiGenerationProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('features-connector')).toHaveTextContent(
        NIGHTSHIFT_DEFAULT_MODELS.kiExtraction
      );
      expect(screen.getByTestId('queries-connector')).toHaveTextContent(
        NIGHTSHIFT_DEFAULT_MODELS.kiQueryGeneration
      );
    });
    expect(screen.getByTestId('features-loading')).toHaveTextContent('false');
    expect(screen.getByTestId('queries-loading')).toHaveTextContent('false');
  });
});
