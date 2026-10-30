/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen } from '@testing-library/react';
import type { NightshiftSource } from '@kbn/nightshift-shared';
import {
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
});
