/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import type { Detection } from '@kbn/significant-events-schema';
import { fireEvent, render, screen } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import React from 'react';
import { Router } from '@kbn/shared-ux-router';
import { useDetectionById } from '../../../data/detections/use_detection_by_id';
import { useDetectionsList } from '../../../data/detections/use_detections_list';
import { SignalsTab } from './signals_tab';

const mockAddWarning = jest.fn();
const mockTimeRangeChange = jest.fn();

jest.mock('../../../hooks/use_format_timestamp', () => ({
  ...jest.requireActual('../../../hooks/use_format_timestamp'),
  useFormatTimestamp: () => (timestamp: string) => timestamp,
}));
jest.mock('../../../components/entities/detection/detection_details_flyout', () => ({
  DetectionDetailsFlyout: ({ detection }: { detection: Detection }) => (
    <div data-test-subj="detectionDetailsFlyoutStub">{detection.rule_name}</div>
  ),
}));
jest.mock('../../../data/detections/use_detection_by_id');
jest.mock('../../../data/detections/use_detections_list');
jest.mock('../../../data/sources/use_sources_by_id', () => ({
  useSourcesById: () => ({ getSourceTitle: (sourceId: string) => sourceId }),
}));
jest.mock('../../../hooks/use_kibana', () => ({
  useKibana: () => ({
    services: {
      notifications: {
        toasts: {
          addWarning: mockAddWarning,
        },
      },
    },
  }),
}));

const mockUseDetectionById = useDetectionById as jest.Mock;
const mockUseDetectionsList = useDetectionsList as jest.Mock;

const signal = {
  '@timestamp': '2026-10-20T11:00:00.000Z',
  detection_id: 'signal-1',
  rule_uuid: 'rule-1',
  rule_name: 'Checkout latency',
  source_id: 'source-1',
  change_point_type: 'spike',
  p_value: 0.01,
  severity_score: 70,
  processed: false,
} as Detection;

const renderTab = (
  initialPath = '/detections/signals',
  { entities = [], unassigned = false }: { entities?: string[]; unassigned?: boolean } = {}
) => {
  const history = createMemoryHistory({ initialEntries: [initialPath] });
  render(
    <I18nProvider>
      <EuiProvider>
        <Router history={history}>
          <SignalsTab
            entities={entities}
            unassigned={unassigned}
            timeRange={{ from: 'now-24h', to: 'now' }}
            onTimeRangeChange={mockTimeRangeChange}
          />
        </Router>
      </EuiProvider>
    </I18nProvider>
  );
  return history;
};

describe('SignalsTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDetectionsList.mockReturnValue({
      data: { hits: [signal], page: 1, perPage: 25, total: 1 },
      isLoading: false,
      isFetching: false,
      refetch: jest.fn(),
    });
    mockUseDetectionById.mockReturnValue({
      data: undefined,
      isError: false,
      isLoading: false,
      isSuccess: false,
      refetch: jest.fn(),
    });
  });

  it('sends the entity selection and URL filters to the list request', () => {
    renderTab('/detections/signals?signalsSearch=checkout&changeType=spike', {
      entities: ['service-a'],
      unassigned: true,
    });

    expect(mockUseDetectionsList).toHaveBeenLastCalledWith({
      from: 'now-24h',
      to: 'now',
      page: 1,
      perPage: 25,
      search: 'checkout',
      change_point_type: ['spike'],
      entityIds: ['service-a'],
      unassignedEntities: true,
    });
  });

  it('opens a deep-linked signal outside the current page from the by-id query', () => {
    const deepLinkedSignal = {
      ...signal,
      detection_id: 'signal-deep',
      rule_name: 'Deep-linked signal',
    };
    mockUseDetectionById.mockReturnValue({
      data: deepLinkedSignal,
      isLoading: false,
      isSuccess: true,
    });

    renderTab('/detections/signals?signalId=signal-deep');

    expect(mockUseDetectionById).toHaveBeenCalledWith('signal-deep', { enabled: true });
    expect(screen.getByTestId('detectionDetailsFlyoutStub')).toHaveTextContent(
      'Deep-linked signal'
    );
  });

  it('toasts and clears a missing signal id with replace', () => {
    mockUseDetectionById.mockReturnValue({ data: null, isLoading: false, isSuccess: true });

    const history = renderTab('/detections/signals?signalId=signal-gone&changeType=spike');

    expect(mockAddWarning).toHaveBeenCalledWith({ title: 'This signal no longer exists' });
    expect(history.action).toBe('REPLACE');
    expect(history.location.search).toBe('?changeType=spike');
    expect(screen.queryByTestId('detectionDetailsFlyoutStub')).not.toBeInTheDocument();
  });

  it('shows a retry action when a deep-linked signal cannot be loaded', () => {
    const refetch = jest.fn();
    mockUseDetectionById.mockReturnValue({
      data: undefined,
      isError: true,
      isLoading: false,
      isSuccess: false,
      refetch,
    });

    renderTab('/detections/signals?signalId=signal-failed');

    expect(screen.getByTestId('nightshiftDetectionSignalError')).toHaveTextContent(
      'Unable to open signal'
    );
    fireEvent.click(screen.getByTestId('nightshiftDetectionSignalRetryButton'));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('hides a retained by-id error when the selected signal is resolved by the list', () => {
    mockUseDetectionById.mockReturnValue({
      data: undefined,
      isError: true,
      isLoading: false,
      isSuccess: false,
      refetch: jest.fn(),
    });

    renderTab('/detections/signals?signalId=signal-1');

    expect(screen.getByTestId('detectionDetailsFlyoutStub')).toHaveTextContent('Checkout latency');
    expect(screen.queryByTestId('nightshiftDetectionSignalError')).not.toBeInTheDocument();
  });
});
