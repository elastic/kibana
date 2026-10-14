/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import type { NightshiftSource } from '@kbn/nightshift-shared';
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
  expectOnboardingStart: jest.fn(),
};

let mockSources: NightshiftSource[] = [];

jest.mock('../../../../hooks/use_fetch_sources', () => ({
  useFetchSources: () => ({
    data: mockSources,
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
}));

const createSource = (esqlUpdatedAt: string): NightshiftSource => ({
  id: 'source-1',
  title: 'Nginx errors',
  tags: [],
  esql: 'FROM logs-nginx-*',
  type: 'logs',
  slug: 'nginx-errors',
  view_name: '$.nightshift.sources.default.nginx-errors',
  enabled: true,
  created_by: 'marco',
  created_at: '2026-09-01T00:00:00.000Z',
  updated_at: esqlUpdatedAt,
  esql_updated_at: esqlUpdatedAt,
});

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

describe('KiGenerationProvider status polling', () => {
  beforeEach(() => {
    mockBulkOnboarding.onboardingStatusUpdateQueue.add.mockClear();
    mockSources = [];
  });

  it('enqueues a source once and again only when its query version changes', () => {
    mockSources = [createSource('2026-09-01T00:00:00.000Z')];
    const { rerender } = render(<KiGenerationProvider>{null}</KiGenerationProvider>);
    expect(mockBulkOnboarding.onboardingStatusUpdateQueue.add).toHaveBeenCalledTimes(1);

    mockSources = [createSource('2026-09-01T00:00:00.000Z')];
    rerender(<KiGenerationProvider>{null}</KiGenerationProvider>);
    expect(mockBulkOnboarding.onboardingStatusUpdateQueue.add).toHaveBeenCalledTimes(1);

    mockSources = [createSource('2026-09-02T00:00:00.000Z')];
    rerender(<KiGenerationProvider>{null}</KiGenerationProvider>);
    expect(mockBulkOnboarding.onboardingStatusUpdateQueue.add).toHaveBeenCalledTimes(2);
    expect(mockBulkOnboarding.onboardingStatusUpdateQueue.add).toHaveBeenLastCalledWith('source-1');
  });
});
