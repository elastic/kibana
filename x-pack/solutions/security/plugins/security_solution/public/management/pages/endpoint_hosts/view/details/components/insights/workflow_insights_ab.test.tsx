/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { WorkflowInsightsAB } from './workflow_insights_ab';
import { useFetchInsightsAB } from '../../../hooks/insights/use_fetch_insights_ab';
import { useFetchPendingScans } from '../../../hooks/insights/use_fetch_pending_scans';
import { useTriggerScanAB } from '../../../hooks/insights/use_trigger_scan_ab';

jest.mock('../../../hooks/insights/use_fetch_insights_ab');
jest.mock('../../../hooks/insights/use_fetch_pending_scans');
jest.mock('../../../hooks/insights/use_trigger_scan_ab');

const mockAddDanger = jest.fn();
jest.mock('../../../../../../../common/lib/kibana', () => ({
  useToasts: () => ({ addDanger: mockAddDanger }),
}));

jest.mock('./workflow_insights_scan_ab', () => ({
  WorkflowInsightsScanSectionAB: ({
    onScanButtonClick,
  }: {
    onScanButtonClick: (connectorId: string) => void;
  }) => (
    <button type="button" onClick={() => onScanButtonClick('connector-1')}>
      {'scan'}
    </button>
  ),
}));

jest.mock('./components/stale_endpoint_package_banner', () => ({
  StaleEndpointPackageBanner: () => <div />,
}));

jest.mock('./workflow_insights_results', () => ({
  WorkflowInsightsResults: ({
    scanCompleted,
    results,
  }: {
    scanCompleted: boolean;
    results?: Array<unknown>;
  }) =>
    scanCompleted && (results ?? []).length === 0 ? (
      <div data-test-subj="workflowInsightsEmptyResultsCallout" />
    ) : null,
}));

const useFetchInsightsABMock = useFetchInsightsAB as jest.Mock;
const useFetchPendingScansMock = useFetchPendingScans as jest.Mock;
const useTriggerScanABMock = useTriggerScanAB as jest.Mock;

type TriggerScanConfig = Parameters<typeof useTriggerScanAB>[0];

const EMPTY_RESULTS_CALLOUT = '[data-test-subj="workflowInsightsEmptyResultsCallout"]';

const latestPendingConfig = () => {
  const { calls } = useFetchPendingScansMock.mock;
  return calls[calls.length - 1][0];
};

describe('WorkflowInsightsAB completion-time refresh', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useFetchPendingScansMock.mockReturnValue({ data: { pending: [] } });
    useTriggerScanABMock.mockImplementation(({ onSuccess }: TriggerScanConfig) => ({
      mutate: () =>
        onSuccess({
          executions: [{ executionId: 'e1', insightType: 'incompatible_antivirus' }],
          failures: [],
        }),
      isLoading: false,
    }));
  });

  it('does not refetch on mount poll success but refetches after a user-triggered scan succeeds', async () => {
    const refetch = jest.fn().mockResolvedValue({ data: [] });
    useFetchInsightsABMock.mockReturnValue({ data: [], refetch });

    render(<WorkflowInsightsAB endpointId="ep-1" />);

    await act(async () => {
      await latestPendingConfig().onSuccess();
    });
    expect(refetch).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.click(screen.getByText('scan'));
    });

    await act(async () => {
      await latestPendingConfig().onSuccess();
    });
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('refetches insights on user terminal failure and still surfaces a toast', async () => {
    const refetch = jest.fn().mockResolvedValue({ data: [] });
    useFetchInsightsABMock.mockReturnValue({ data: [], refetch });

    render(<WorkflowInsightsAB endpointId="ep-1" />);

    await act(async () => {
      fireEvent.click(screen.getByText('scan'));
    });

    await act(async () => {
      await latestPendingConfig().onFailure(['boom']);
    });

    expect(refetch).toHaveBeenCalledTimes(1);
    expect(mockAddDanger).toHaveBeenCalled();
  });

  it('does not finalize the empty-results state until the completion refetch resolves', async () => {
    let resolveRefetch: (() => void) | undefined;
    const refetch = jest.fn(
      () =>
        new Promise((resolve) => {
          resolveRefetch = () => resolve({ data: [] });
        })
    );
    useFetchInsightsABMock.mockReturnValue({ data: [], refetch });

    const { container } = render(<WorkflowInsightsAB endpointId="ep-1" />);

    await act(async () => {
      fireEvent.click(screen.getByText('scan'));
    });

    let pending: Promise<void> | undefined;
    act(() => {
      pending = latestPendingConfig().onSuccess();
    });

    expect(container.querySelector(EMPTY_RESULTS_CALLOUT)).toBeNull();

    await act(async () => {
      resolveRefetch?.();
      await pending;
    });
    expect(container.querySelector(EMPTY_RESULTS_CALLOUT)).not.toBeNull();
  });

  it('stops pending polling before the completion refetch resolves so it cannot re-enter and duplicate the refetch', async () => {
    let resolveRefetch: (() => void) | undefined;
    const refetch = jest.fn(
      () =>
        new Promise((resolve) => {
          resolveRefetch = () => resolve({ data: [] });
        })
    );
    useFetchInsightsABMock.mockReturnValue({ data: [], refetch });

    render(<WorkflowInsightsAB endpointId="ep-1" />);

    await act(async () => {
      fireEvent.click(screen.getByText('scan'));
    });
    expect(latestPendingConfig().isPolling).toBe(true);

    let pending: Promise<void> | undefined;
    act(() => {
      pending = latestPendingConfig().onSuccess();
    });

    expect(latestPendingConfig().isPolling).toBe(false);
    expect(refetch).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveRefetch?.();
      await pending;
    });
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('stops pending polling before the failure refetch resolves and fires exactly one toast', async () => {
    let resolveRefetch: (() => void) | undefined;
    const refetch = jest.fn(
      () =>
        new Promise((resolve) => {
          resolveRefetch = () => resolve({ data: [] });
        })
    );
    useFetchInsightsABMock.mockReturnValue({ data: [], refetch });

    render(<WorkflowInsightsAB endpointId="ep-1" />);

    await act(async () => {
      fireEvent.click(screen.getByText('scan'));
    });

    let pending: Promise<void> | undefined;
    act(() => {
      pending = latestPendingConfig().onFailure(['boom']);
    });

    expect(latestPendingConfig().isPolling).toBe(false);
    expect(mockAddDanger).not.toHaveBeenCalled();

    await act(async () => {
      resolveRefetch?.();
      await pending;
    });
    expect(refetch).toHaveBeenCalledTimes(1);
    expect(mockAddDanger).toHaveBeenCalledTimes(1);
  });
});

describe('WorkflowInsightsAB observer latch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useFetchPendingScansMock.mockReturnValue({ data: { pending: [] } });
    useTriggerScanABMock.mockImplementation(({ onSuccess }: TriggerScanConfig) => ({
      mutate: () =>
        onSuccess({
          executions: [{ executionId: 'e1', insightType: 'incompatible_antivirus' }],
          failures: [],
        }),
      isLoading: false,
    }));
  });

  it('observer-latched on running scan: terminal success refetches and shows empty results callout', async () => {
    const refetch = jest.fn().mockResolvedValue({ data: [] });
    useFetchInsightsABMock.mockReturnValue({ data: [], refetch });
    useFetchPendingScansMock.mockReturnValue({ data: { pending: [{ status: 'running' }] } });

    const { container } = render(<WorkflowInsightsAB endpointId="ep-1" />);

    await act(async () => {
      await latestPendingConfig().onSuccess();
    });

    expect(refetch).toHaveBeenCalledTimes(1);
    expect(container.querySelector(EMPTY_RESULTS_CALLOUT)).not.toBeNull();
    expect(mockAddDanger).not.toHaveBeenCalled();
  });

  it('observer-latched on running scan: terminal success with results refetches without empty callout', async () => {
    const refetch = jest.fn().mockResolvedValue({});
    useFetchInsightsABMock.mockReturnValue({
      data: [
        {
          type: 'incompatible_antivirus',
          action: { type: 'refreshed' },
          '@timestamp': '2024-01-01T00:00:00Z',
        },
      ],
      refetch,
    });
    useFetchPendingScansMock.mockReturnValue({ data: { pending: [{ status: 'running' }] } });

    const { container } = render(<WorkflowInsightsAB endpointId="ep-1" />);

    await act(async () => {
      await latestPendingConfig().onSuccess();
    });

    expect(refetch).toHaveBeenCalledTimes(1);
    expect(container.querySelector(EMPTY_RESULTS_CALLOUT)).toBeNull();
  });

  it('observer-latched on running scan: terminal failure refetches and shows danger toast', async () => {
    const refetch = jest.fn().mockResolvedValue({ data: [] });
    useFetchInsightsABMock.mockReturnValue({ data: [], refetch });
    useFetchPendingScansMock.mockReturnValue({ data: { pending: [{ status: 'running' }] } });

    render(<WorkflowInsightsAB endpointId="ep-1" />);

    await act(async () => {
      await latestPendingConfig().onFailure(['boom']);
    });

    expect(refetch).toHaveBeenCalledTimes(1);
    expect(mockAddDanger).toHaveBeenCalledTimes(1);
  });

  it('stale terminal failure on mount without prior running scan stays silent', async () => {
    const refetch = jest.fn().mockResolvedValue({ data: [] });
    useFetchInsightsABMock.mockReturnValue({ data: [], refetch });
    useFetchPendingScansMock.mockReturnValue({ data: { pending: [{ status: 'failed' }] } });

    render(<WorkflowInsightsAB endpointId="ep-1" />);

    await act(async () => {
      await latestPendingConfig().onFailure(['boom']);
    });

    expect(refetch).not.toHaveBeenCalled();
    expect(mockAddDanger).not.toHaveBeenCalled();
  });

  it('endpoint change resets observer latch so subsequent idle poll does not trigger feedback', async () => {
    const refetch = jest.fn().mockResolvedValue({ data: [] });
    useFetchInsightsABMock.mockReturnValue({ data: [], refetch });
    useFetchPendingScansMock.mockReturnValue({ data: { pending: [{ status: 'running' }] } });

    const { rerender } = render(<WorkflowInsightsAB endpointId="ep-1" />);

    useFetchPendingScansMock.mockReturnValue({ data: { pending: [] } });
    await act(async () => {
      rerender(<WorkflowInsightsAB endpointId="ep-2" />);
    });

    await act(async () => {
      await latestPendingConfig().onSuccess();
    });

    expect(refetch).not.toHaveBeenCalled();
  });
});
