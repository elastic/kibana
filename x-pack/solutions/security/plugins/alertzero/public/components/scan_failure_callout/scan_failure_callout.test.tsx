/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type ComponentProps } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { of } from 'rxjs';
import { EuiProvider } from '@elastic/eui';
import { coreMock } from '@kbn/core/public/mocks';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { WorkflowsManagementUiActions } from '@kbn/workflows/common/privileges';
import type { ScanFailureWorker, ScanFailuresResponse } from '@kbn/alertzero-common';
import {
  SYSTEM_SECURITY_WATCH_FLOOR_ID,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
} from '@kbn/alertzero-common';
import { SCAN_FAILURE_DISMISSED_AT_STORAGE_KEY_PREFIX } from '../../hooks/use_scan_failure_dismissal';
import type { UseQueryResult } from '@kbn/react-query';
import { useScanFailures } from '../../hooks/use_scan_failures';
import { ScanFailureCallout } from './scan_failure_callout';

jest.mock('../../hooks/use_scan_failures', () => ({
  useScanFailures: jest.fn(),
}));

const useScanFailuresMock = useScanFailures as jest.MockedFunction<typeof useScanFailures>;

const queryResult = (
  value: Pick<UseQueryResult<ScanFailuresResponse>, 'data' | 'error' | 'isLoading'>
): UseQueryResult<ScanFailuresResponse> => value as unknown as UseQueryResult<ScanFailuresResponse>;

const STORAGE_KEY = `${SCAN_FAILURE_DISMISSED_AT_STORAGE_KEY_PREFIX}.default`;
const FAILED_AT = '2026-01-01T10:00:00.000Z';
const BEFORE_FAILURE = '2026-01-01T09:00:00.000Z';
const AFTER_FAILURE = '2026-01-01T11:00:00.000Z';

const attackDiscovery: ScanFailureWorker = {
  workerId: SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
  watchId: SYSTEM_SECURITY_WATCH_FLOOR_ID,
  workflowId: `${SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID}-default`,
  lastFailedAt: FAILED_AT,
};

const ruleTuning: ScanFailureWorker = {
  workerId: SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
  watchId: SYSTEM_SECURITY_WATCH_FLOOR_ID,
  workflowId: `${SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID}-default`,
  lastFailedAt: AFTER_FAILURE,
};

const renderCallout = ({
  surface = 'queue',
  wrapper,
}: Partial<ComponentProps<typeof ScanFailureCallout>> = {}) => {
  const core = coreMock.createStart();
  core.application.getUrlForApp.mockImplementation(
    (appId: string, options?: { path?: string }) => `/app/${appId}${options?.path ?? ''}`
  );
  core.settings.client.get.mockReturnValue(true);
  core.settings.client.get$.mockReturnValue(of(true));
  core.application.capabilities = {
    ...core.application.capabilities,
    workflowsManagement: { [WorkflowsManagementUiActions.readManagedExecution]: true },
  };

  const tree = () => (
    <I18nProvider>
      <EuiProvider>
        <KibanaContextProvider services={core}>
          <ScanFailureCallout surface={surface} wrapper={wrapper} />
        </KibanaContextProvider>
      </EuiProvider>
    </I18nProvider>
  );
  const { rerender } = render(tree());
  return { reportEvent: core.analytics.reportEvent as jest.Mock, rerender: () => rerender(tree()) };
};

describe('ScanFailureCallout', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders nothing while the query is loading', () => {
    useScanFailuresMock.mockReturnValue(
      queryResult({
        data: undefined,
        isLoading: true,
        error: null,
      })
    );

    renderCallout();

    expect(screen.queryByTestId('alertZeroScanFailureCallout')).not.toBeInTheDocument();
  });

  it('renders nothing when the query fails', () => {
    useScanFailuresMock.mockReturnValue(
      queryResult({
        data: undefined,
        isLoading: false,
        error: new Error('unavailable'),
      })
    );

    renderCallout();

    expect(screen.queryByTestId('alertZeroScanFailureCallout')).not.toBeInTheDocument();
  });

  it('renders nothing when nothing failed', () => {
    useScanFailuresMock.mockReturnValue(
      queryResult({
        data: { workers: [], unknown: false, lastFailedAt: null },
        isLoading: false,
        error: null,
      })
    );

    renderCallout();

    expect(screen.queryByTestId('alertZeroScanFailureCallout')).not.toBeInTheDocument();
  });

  it('links a failing Worker to its failed executions', () => {
    useScanFailuresMock.mockReturnValue(
      queryResult({
        data: { workers: [attackDiscovery], unknown: false, lastFailedAt: FAILED_AT },
        isLoading: false,
        error: null,
      })
    );

    renderCallout();

    expect(screen.getByRole('link', { name: /Attack Discovery/ })).toHaveAttribute(
      'href',
      `/app/workflows/${SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID}-default?executionStatuses=failed&tab=executions`
    );
  });

  describe('dismissal', () => {
    const mockFailures = (data: ScanFailuresResponse) =>
      useScanFailuresMock.mockReturnValue(queryResult({ data, isLoading: false, error: null }));

    it('hides the callout and stores the dismissal time', () => {
      mockFailures({ workers: [attackDiscovery], unknown: false, lastFailedAt: FAILED_AT });
      renderCallout();

      fireEvent.click(screen.getByTestId('euiDismissCalloutButton'));

      expect(screen.queryByTestId('alertZeroScanFailureCallout')).not.toBeInTheDocument();
      expect(Date.parse(JSON.parse(localStorage.getItem(STORAGE_KEY) as string))).not.toBeNaN();
    });

    it('stays hidden when every failure happened before the dismissal', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(AFTER_FAILURE));
      mockFailures({ workers: [attackDiscovery], unknown: true, lastFailedAt: FAILED_AT });

      renderCallout();

      expect(screen.queryByTestId('alertZeroScanFailureCallout')).not.toBeInTheDocument();
    });

    it('comes back with only the Workers that failed after the dismissal', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify('2026-01-01T10:30:00.000Z'));
      mockFailures({
        workers: [attackDiscovery, ruleTuning],
        unknown: false,
        lastFailedAt: AFTER_FAILURE,
      });

      renderCallout();

      expect(screen.getByRole('link', { name: /Rule Tuning/ })).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /Attack Discovery/ })).not.toBeInTheDocument();
    });

    it('shows the generic line again only for a newer failure', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(BEFORE_FAILURE));
      mockFailures({ workers: [], unknown: true, lastFailedAt: FAILED_AT });

      renderCallout();

      expect(screen.getByTestId('alertZeroScanFailureUnknown')).toBeInTheDocument();
    });

    it('ignores a stored dismissal that is not a date', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify('not-a-date'));
      mockFailures({ workers: [attackDiscovery], unknown: false, lastFailedAt: FAILED_AT });

      renderCallout();

      expect(screen.getByTestId('alertZeroScanFailureCallout')).toBeInTheDocument();
    });

    it('does not render the wrapper once dismissed', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(AFTER_FAILURE));
      mockFailures({ workers: [attackDiscovery], unknown: false, lastFailedAt: FAILED_AT });

      renderCallout({ wrapper: (callout) => <div data-test-subj="calloutWrapper">{callout}</div> });

      expect(screen.queryByTestId('calloutWrapper')).not.toBeInTheDocument();
    });
  });

  it('shows the generic line', () => {
    useScanFailuresMock.mockReturnValue(
      queryResult({
        data: { workers: [], unknown: true, lastFailedAt: FAILED_AT },
        isLoading: false,
        error: null,
      })
    );

    renderCallout();

    expect(screen.getByTestId('alertZeroScanFailureUnknown')).toHaveTextContent(
      'Another scan reported a problem.'
    );
  });

  it('does not link the generic line', () => {
    useScanFailuresMock.mockReturnValue(
      queryResult({
        data: { workers: [], unknown: true, lastFailedAt: FAILED_AT },
        isLoading: false,
        error: null,
      })
    );

    renderCallout();

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  describe('wrapper', () => {
    const wrapper = (callout: JSX.Element) => <div data-test-subj="calloutWrapper">{callout}</div>;

    it('wraps the callout when something failed', () => {
      useScanFailuresMock.mockReturnValue(
        queryResult({
          data: { workers: [], unknown: true, lastFailedAt: FAILED_AT },
          isLoading: false,
          error: null,
        })
      );

      renderCallout({ wrapper });

      expect(screen.getByTestId('calloutWrapper')).toContainElement(
        screen.getByTestId('alertZeroScanFailureCallout')
      );
    });

    it('does not render the wrapper when nothing failed', () => {
      useScanFailuresMock.mockReturnValue(
        queryResult({
          data: { workers: [], unknown: false, lastFailedAt: null },
          isLoading: false,
          error: null,
        })
      );

      renderCallout({ wrapper });

      expect(screen.queryByTestId('calloutWrapper')).not.toBeInTheDocument();
    });

    it('does not render the wrapper while loading', () => {
      useScanFailuresMock.mockReturnValue(
        queryResult({
          data: undefined,
          isLoading: true,
          error: null,
        })
      );

      renderCallout({ wrapper });

      expect(screen.queryByTestId('calloutWrapper')).not.toBeInTheDocument();
    });
  });

  describe('telemetry', () => {
    const mockFailures = (data: ScanFailuresResponse) =>
      useScanFailuresMock.mockReturnValue(queryResult({ data, isLoading: false, error: null }));

    it('reports the callout once, as a Worker scan failure on its surface', () => {
      mockFailures({ workers: [], unknown: true, lastFailedAt: FAILED_AT });

      const { reportEvent, rerender } = renderCallout({ surface: 'onboarding' });
      rerender();

      expect(reportEvent.mock.calls).toEqual([
        ['alertzero_ui_error_shown', { error_class: 'worker_scan_failed', surface: 'onboarding' }],
      ]);
    });

    it('reports nothing when nothing failed, the failures could not be read, or they were dismissed', () => {
      useScanFailuresMock.mockReturnValue(
        queryResult({ data: undefined, isLoading: false, error: new Error('unavailable') })
      );
      const unreadable = renderCallout();
      mockFailures({ workers: [], unknown: false, lastFailedAt: null });
      const clean = renderCallout();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(AFTER_FAILURE));
      mockFailures({ workers: [attackDiscovery], unknown: false, lastFailedAt: FAILED_AT });
      const dismissed = renderCallout();

      expect(
        [unreadable, clean, dismissed].map(({ reportEvent }) => reportEvent.mock.calls)
      ).toEqual([[], [], []]);
    });
  });
});
