/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithKibanaRenderContext } from '@kbn/test-jest-helpers';
import { AnomaliesResults } from '.';
import type {
  LogEntryAnomalies,
  SortOptions,
  PaginationOptions,
} from '../../use_log_entry_anomalies_results';
import type { TimeRange } from '../../../../../../common/time/time_range';

// Keep tests focused on the state machine; children have their own tests.
// Kibana's testing-library setup resolves getByTestId via data-test-subj.
jest.mock('./anomalies_swimlane_visualisation', () => ({
  AnomaliesSwimlaneVisualisation: () => <div data-test-subj="anomaliesSwimlane" />,
}));
jest.mock('./table', () => ({
  AnomaliesTable: () => <div data-test-subj="anomaliesTable" />,
}));

const timeRange: TimeRange = {
  startTime: new Date('2026-06-12T14:00:00.000Z').valueOf(),
  endTime: new Date('2026-06-12T15:00:00.000Z').valueOf(),
};

const sortOptions: SortOptions = { field: 'anomalyScore', direction: 'desc' };
const paginationOptions: PaginationOptions = { pageSize: 25 };

const baseProps = {
  isLoadingAnomaliesResults: false,
  hasFailedLoadingAnomaliesResults: false,
  onRetryAnomaliesResults: jest.fn(),
  anomalies: [] as LogEntryAnomalies,
  timeRange,
  page: 1,
  fetchNextPage: undefined,
  fetchPreviousPage: undefined,
  changeSortOptions: jest.fn(),
  changePaginationOptions: jest.fn(),
  sortOptions,
  paginationOptions,
  selectedDatasets: [],
  jobIds: ['job-1'],
  autoRefresh: { isPaused: true, interval: 0 },
};

const renderComponent = (props: Partial<typeof baseProps> = {}) =>
  renderWithKibanaRenderContext(<AnomaliesResults {...baseProps} {...props} />);

describe('AnomaliesResults', () => {
  // There is no "failed with stale results" case to cover: useLogEntryAnomaliesResults
  // clears the list on any non-cancellation rejection, so a failure always implies an
  // empty `anomalies` array. The first case below already pins the failure prompt as
  // taking precedence over the table.
  describe('when the fetch fails', () => {
    it('shows the failure prompt and not the empty or table states', () => {
      renderComponent({ hasFailedLoadingAnomaliesResults: true });

      expect(screen.getByTestId('infraAnomaliesFailurePrompt')).toBeInTheDocument();
      expect(screen.queryByTestId('anomaliesTable')).not.toBeInTheDocument();
      expect(screen.queryByTestId('infraAnomaliesNoDataPrompt')).not.toBeInTheDocument();
    });

    it('calls the retry callback when the retry button is clicked', () => {
      const onRetry = jest.fn();
      renderComponent({
        hasFailedLoadingAnomaliesResults: true,
        onRetryAnomaliesResults: onRetry,
      });

      fireEvent.click(screen.getByTestId('infraAnomaliesFailurePromptRetryButton'));
      expect(onRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe('when the fetch is successful but empty', () => {
    it('shows the "no data" empty prompt and not the failure prompt', () => {
      renderComponent({ hasFailedLoadingAnomaliesResults: false, anomalies: [] });

      expect(screen.getByTestId('infraAnomaliesNoDataPrompt')).toBeInTheDocument();
      expect(screen.queryByTestId('infraAnomaliesFailurePrompt')).not.toBeInTheDocument();
      expect(screen.queryByTestId('anomaliesTable')).not.toBeInTheDocument();
    });
  });

  describe('when rows are available', () => {
    it('shows the table and not the prompts', () => {
      const anomaly = {
        id: 'anomaly-1',
        anomalyScore: 75,
        dataset: 'nginx',
        typical: 100,
        actual: 200,
        startTime: new Date('2026-06-12T14:30:00.000Z').valueOf(),
        duration: 900_000,
        type: 'logRate' as const,
        jobId: 'job-1',
      };
      renderComponent({
        hasFailedLoadingAnomaliesResults: false,
        anomalies: [anomaly],
      });

      expect(screen.getByTestId('anomaliesTable')).toBeInTheDocument();
      expect(screen.queryByTestId('infraAnomaliesFailurePrompt')).not.toBeInTheDocument();
      expect(screen.queryByTestId('infraAnomaliesNoDataPrompt')).not.toBeInTheDocument();
    });
  });
});
