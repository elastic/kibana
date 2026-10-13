/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type ComponentProps } from 'react';
import { render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { Router } from '@kbn/shared-ux-router';
import { createMemoryHistory } from 'history';
import type { ScanFailuresResponse } from '@kbn/alertzero-common';
import { SYSTEM_SECURITY_WATCH_FLOOR_ID } from '@kbn/alertzero-common';
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

const renderCallout = (props: ComponentProps<typeof ScanFailureCallout> = {}) => {
  render(
    <I18nProvider>
      <EuiProvider>
        <Router history={createMemoryHistory()}>
          <ScanFailureCallout {...props} />
        </Router>
      </EuiProvider>
    </I18nProvider>
  );
};

describe('ScanFailureCallout', () => {
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
        data: { workers: [], unknown: false },
        isLoading: false,
        error: null,
      })
    );

    renderCallout();

    expect(screen.queryByTestId('alertZeroScanFailureCallout')).not.toBeInTheDocument();
  });

  it('links a failing Worker to its Watch page', () => {
    useScanFailuresMock.mockReturnValue(
      queryResult({
        data: {
          workers: [
            {
              workerId: 'system-security-floor-attack-discovery',
              watchId: SYSTEM_SECURITY_WATCH_FLOOR_ID,
            },
          ],
          unknown: false,
        },
        isLoading: false,
        error: null,
      })
    );

    renderCallout();

    expect(screen.getByRole('link', { name: 'Attack Discovery' })).toHaveAttribute(
      'href',
      `/watches/${SYSTEM_SECURITY_WATCH_FLOOR_ID}`
    );
  });

  it('shows the generic line', () => {
    useScanFailuresMock.mockReturnValue(
      queryResult({
        data: { workers: [], unknown: true },
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
        data: { workers: [], unknown: true },
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
          data: { workers: [], unknown: true },
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
          data: { workers: [], unknown: false },
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
});
