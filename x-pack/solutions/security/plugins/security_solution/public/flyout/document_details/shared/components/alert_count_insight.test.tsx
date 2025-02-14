/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, renderHook } from '@testing-library/react';
import { TestProviders } from '../../../../common/mock';
import { AlertCountInsight, getFormattedAlertStats } from './alert_count_insight';
import { useAlertsByStatus } from '../../../../overview/components/detection_response/alerts_by_status/use_alerts_by_status';
import type { ParsedAlertsData } from '../../../../overview/components/detection_response/alerts_by_status/types';
import { useEuiTheme } from '@elastic/eui';
import {
  INSIGHTS_ALERTS_COUNT_INVESTIGATE_IN_TIMELINE_BUTTON_TEST_ID,
  INSIGHTS_ALERTS_COUNT_TEXT_TEST_ID,
  INSIGHTS_ALERTS_COUNT_NAVIGATION_BUTTON_TEST_ID,
} from './test_ids';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { useSignalIndex } from '../../../../detections/containers/detection_engine/alerts/use_signal_index';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';

jest.mock('../../../../common/lib/kibana');
jest.mock('../../../../detections/containers/detection_engine/alerts/use_signal_index');
jest.mock('../../../../common/components/user_privileges');
jest.mock('../../../../common/hooks/use_experimental_features');

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return { ...actual, useLocation: jest.fn().mockReturnValue({ pathname: '' }) };
});
jest.mock('@kbn/cloud-security-posture/src/hooks/use_misconfiguration_preview');
jest.mock(
  '../../../../overview/components/detection_response/alerts_by_status/use_alerts_by_status'
);

const fieldName = 'host.name';
const name = 'test host';
const testId = 'test';
const mockAlertData: ParsedAlertsData = {
  open: {
    total: 4,
    severities: [
      { key: 'high', value: 1, label: 'High' },
      { key: 'low', value: 1, label: 'Low' },
      { key: 'medium', value: 1, label: 'Medium' },
      { key: 'critical', value: 1, label: 'Critical' },
    ],
  },
  acknowledged: {
    total: 4,
    severities: [
      { key: 'high', value: 1, label: 'High' },
      { key: 'low', value: 1, label: 'Low' },
      { key: 'medium', value: 1, label: 'Medium' },
      { key: 'critical', value: 1, label: 'Critical' },
    ],
  },
  closed: {
    total: 6,
    severities: [
      { key: 'high', value: 1, label: 'High' },
      { key: 'low', value: 1, label: 'Low' },
      { key: 'medium', value: 2, label: 'Medium' },
      { key: 'critical', value: 2, label: 'Critical' },
    ],
  },
};

const openDetailsPanel = jest.fn();

const renderAlertCountInsight = () => {
  return render(
    <TestProviders>
      <AlertCountInsight
        name={name}
        fieldName={fieldName}
        data-test-subj={testId}
        openDetailsPanel={openDetailsPanel}
      />
    </TestProviders>
  );
};

describe('AlertCountInsight', () => {
  beforeEach(() => {
    (useSignalIndex as jest.Mock).mockReturnValue({ signalIndexName: '' });
    (useUserPrivileges as jest.Mock).mockReturnValue({ timelinePrivileges: { read: true } });
    (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(false);
  });

  it('renders', () => {
    (useAlertsByStatus as jest.Mock).mockReturnValue({
      isLoading: false,
      items: mockAlertData,
    });

    const { getByTestId, queryByTestId } = renderAlertCountInsight();

    expect(getByTestId(testId)).toBeInTheDocument();
    expect(getByTestId(`${testId}-distribution-bar`)).toBeInTheDocument();
    expect(getByTestId(`${testId}-count`)).toHaveTextContent('8');
    expect(
      getByTestId(INSIGHTS_ALERTS_COUNT_INVESTIGATE_IN_TIMELINE_BUTTON_TEST_ID)
    ).toBeInTheDocument();
    expect(queryByTestId(INSIGHTS_ALERTS_COUNT_TEXT_TEST_ID)).not.toBeInTheDocument();
  });

  it('open entity details panel when clicking on the count if new navigation is enabled', () => {
    (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(true);
    (useAlertsByStatus as jest.Mock).mockReturnValue({
      isLoading: false,
      items: mockAlertData,
    });
    const { getByTestId } = renderAlertCountInsight();
    getByTestId(INSIGHTS_ALERTS_COUNT_NAVIGATION_BUTTON_TEST_ID).click();
    expect(openDetailsPanel).toHaveBeenCalled();
  });

  it('renders the count as text instead of button', () => {
    (useUserPrivileges as jest.Mock).mockReturnValue({ timelinePrivileges: { read: false } });
    (useAlertsByStatus as jest.Mock).mockReturnValue({
      isLoading: false,
      items: mockAlertData,
    });

    const { getByTestId, queryByTestId } = renderAlertCountInsight();

    expect(getByTestId(`${testId}-count`)).toHaveTextContent('8');
    expect(getByTestId(INSIGHTS_ALERTS_COUNT_TEXT_TEST_ID)).toBeInTheDocument();
    expect(
      queryByTestId(INSIGHTS_ALERTS_COUNT_INVESTIGATE_IN_TIMELINE_BUTTON_TEST_ID)
    ).not.toBeInTheDocument();
  });

  it('renders loading spinner if data is being fetched', () => {
    (useAlertsByStatus as jest.Mock).mockReturnValue({ isLoading: true, items: {} });
    const { getByTestId } = renderAlertCountInsight();
    expect(getByTestId(`${testId}-loading-spinner`)).toBeInTheDocument();
  });

  it('renders null if no alert data found', () => {
    (useAlertsByStatus as jest.Mock).mockReturnValue({ isLoading: false, items: {} });
    const { container } = renderAlertCountInsight();
    expect(container).toBeEmptyDOMElement();
  });

  it('renders null if no non-closed alert data found', () => {
    (useAlertsByStatus as jest.Mock).mockReturnValue({
      isLoading: false,
      items: {
        closed: {
          total: 6,
          severities: [
            { key: 'high', value: 1, label: 'High' },
            { key: 'low', value: 1, label: 'Low' },
            { key: 'medium', value: 2, label: 'Medium' },
            { key: 'critical', value: 2, label: 'Critical' },
          ],
        },
      },
    });
    const { container } = renderAlertCountInsight();
    expect(container).toBeEmptyDOMElement();
  });
});

describe('getFormattedAlertStats', () => {
  const { result } = renderHook(() => useEuiTheme());
  const euiTheme = result.current.euiTheme;

  it('should return alert stats', () => {
    const alertStats = getFormattedAlertStats(mockAlertData, euiTheme);
    expect(alertStats).toEqual([
      { key: 'High', count: 2, color: '#DA8B45' },
      { key: 'Low', count: 2, color: '#54B399' },
      { key: 'Medium', count: 2, color: '#D6BF57' },
      { key: 'Critical', count: 2, color: '#E7664C' },
    ]);
  });

  it('should return empty array if no active alerts are available', () => {
    const alertStats = getFormattedAlertStats(
      {
        closed: {
          total: 2,
          severities: [
            { key: 'high', value: 1, label: 'High' },
            { key: 'low', value: 1, label: 'Low' },
          ],
        },
      },
      euiTheme
    );
    expect(alertStats).toEqual([]);
  });
});
