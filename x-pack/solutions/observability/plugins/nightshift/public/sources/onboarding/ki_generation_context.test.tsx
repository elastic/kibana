/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import type { NightshiftSource } from '@kbn/nightshift-shared';
import {
  NIGHTSHIFT_DEFAULT_MODELS,
  SignificantEventsWorkflowStatus,
  type SignificantEventsWorkflowStatusResult,
} from '@kbn/significant-events-schema';
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
let mockIsPaused = false;

jest.mock('../../data/maintenance/use_significant_events_maintenance', () => ({
  useBlocksNewActivity: () => ({ isBlocked: mockIsPaused }),
}));

jest.mock('../../data/sources/use_fetch_sources', () => ({
  useFetchSources: () => ({
    data: mockSources,
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
}));

const createSource = (esqlUpdatedAt: string, enabled = true): NightshiftSource => ({
  id: 'source-1',
  title: 'Nginx errors',
  tags: [],
  esql: 'FROM logs-nginx-*',
  type: 'logs',
  slug: 'nginx-errors',
  view_name: '$.nightshift.sources.default.nginx-errors',
  enabled,
  created_by: 'marco',
  created_at: '2026-09-01T00:00:00.000Z',
  updated_at: esqlUpdatedAt,
  esql_updated_at: esqlUpdatedAt,
});

let reportStatus: (sourceId: string, status: SignificantEventsWorkflowStatusResult) => void = () =>
  undefined;

jest.mock('./use_bulk_onboarding', () => ({
  useBulkOnboarding: ({ onSourceStatusUpdate }: { onSourceStatusUpdate: typeof reportStatus }) => {
    reportStatus = onSourceStatusUpdate;
    return mockBulkOnboarding;
  },
}));

const AwaitingRunProbe = () => {
  const { awaitingRunSourceIds, generatingSourceIds } = useKiGeneration();
  return (
    <>
      <div data-test-subj="awaiting-run">{awaitingRunSourceIds.join(',')}</div>
      <div data-test-subj="generating">{generatingSourceIds.join(',')}</div>
    </>
  );
};

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
    mockBulkOnboarding.expectOnboardingStart.mockClear();
    mockSources = [];
    mockIsPaused = false;
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

  it('marks an edited source as awaiting its run until a status is reported', () => {
    mockSources = [createSource('2026-09-01T00:00:00.000Z')];
    const { rerender } = render(
      <KiGenerationProvider>
        <AwaitingRunProbe />
      </KiGenerationProvider>
    );
    expect(screen.getByTestId('awaiting-run')).toHaveTextContent('');

    mockSources = [createSource('2026-09-02T00:00:00.000Z')];
    rerender(
      <KiGenerationProvider>
        <AwaitingRunProbe />
      </KiGenerationProvider>
    );
    expect(screen.getByTestId('awaiting-run')).toHaveTextContent('source-1');

    act(() => {
      reportStatus('source-1', {
        status: SignificantEventsWorkflowStatus.InProgress,
        executionId: 'run-2',
      });
    });
    expect(screen.getByTestId('awaiting-run')).toHaveTextContent('');
  });

  it('expects no run for a source created in a paused space', () => {
    mockIsPaused = true;
    const { rerender } = render(
      <KiGenerationProvider>
        <AwaitingRunProbe />
      </KiGenerationProvider>
    );

    mockSources = [createSource('2026-09-01T00:00:00.000Z')];
    rerender(
      <KiGenerationProvider>
        <AwaitingRunProbe />
      </KiGenerationProvider>
    );
    expect(screen.getByTestId('generating')).toHaveTextContent('');
    expect(screen.getByTestId('awaiting-run')).toHaveTextContent('');
    expect(mockBulkOnboarding.expectOnboardingStart).not.toHaveBeenCalled();
  });

  describe('when a source is enabled', () => {
    const VERSION = '2026-09-01T00:00:00.000Z';

    it('polls a source that was listed disabled, without showing a spinner', () => {
      mockSources = [createSource(VERSION, false)];
      const { rerender } = render(
        <KiGenerationProvider>
          <AwaitingRunProbe />
        </KiGenerationProvider>
      );
      mockBulkOnboarding.onboardingStatusUpdateQueue.add.mockClear();
      mockBulkOnboarding.expectOnboardingStart.mockClear();

      mockSources = [createSource(VERSION, true)];
      rerender(
        <KiGenerationProvider>
          <AwaitingRunProbe />
        </KiGenerationProvider>
      );

      expect(mockBulkOnboarding.expectOnboardingStart).toHaveBeenCalledWith('source-1');
      expect(mockBulkOnboarding.onboardingStatusUpdateQueue.add).toHaveBeenCalledWith('source-1');
      expect(screen.getByTestId('generating')).toHaveTextContent('');
      expect(screen.getByTestId('awaiting-run')).toHaveTextContent('');
    });

    it.each([
      ['stays enabled', true],
      ['stays disabled', false],
    ])('does not poll a source that %s', (_, enabled) => {
      mockSources = [createSource(VERSION, enabled)];
      const { rerender } = render(<KiGenerationProvider>{null}</KiGenerationProvider>);
      mockBulkOnboarding.onboardingStatusUpdateQueue.add.mockClear();

      mockSources = [createSource(VERSION, enabled)];
      rerender(<KiGenerationProvider>{null}</KiGenerationProvider>);

      expect(mockBulkOnboarding.onboardingStatusUpdateQueue.add).not.toHaveBeenCalled();
      expect(mockBulkOnboarding.expectOnboardingStart).not.toHaveBeenCalled();
    });

    it('expects no run in a paused space', () => {
      mockIsPaused = true;
      mockSources = [createSource(VERSION, false)];
      const { rerender } = render(<KiGenerationProvider>{null}</KiGenerationProvider>);

      mockSources = [createSource(VERSION, true)];
      rerender(<KiGenerationProvider>{null}</KiGenerationProvider>);

      expect(mockBulkOnboarding.expectOnboardingStart).not.toHaveBeenCalled();
    });
  });

  it('announces a failure once, and again only for a new run', () => {
    const onFailed = jest.fn();
    const { rerender } = render(
      <KiGenerationProvider onFailed={onFailed}>{null}</KiGenerationProvider>
    );
    mockSources = [createSource('2026-09-01T00:00:00.000Z')];
    rerender(<KiGenerationProvider onFailed={onFailed}>{null}</KiGenerationProvider>);

    const failed: SignificantEventsWorkflowStatusResult = {
      status: SignificantEventsWorkflowStatus.Failed,
      executionId: 'run-1',
      error: 'boom',
    };
    act(() => reportStatus('source-1', failed));
    act(() => reportStatus('source-1', failed));
    expect(onFailed).toHaveBeenCalledTimes(1);

    act(() => reportStatus('source-1', { ...failed, executionId: 'run-2' }));
    expect(onFailed).toHaveBeenCalledTimes(2);
  });
});
