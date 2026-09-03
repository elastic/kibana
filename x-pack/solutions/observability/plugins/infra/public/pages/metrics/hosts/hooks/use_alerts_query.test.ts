/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import type { AlertStatus } from '@kbn/observability-plugin/common/typings';
import {
  ALERT_STATUS,
  ALERT_STATUS_ACTIVE,
  ALERT_STATUS_RECOVERED,
  ALERT_STATUS_UNTRACKED,
} from '@kbn/rule-data-utils';
import { useAlertsQueryImpl } from './use_alerts_query';
import { useUnifiedSearchContext } from './use_unified_search';
import { useHostsViewContext } from './use_hosts_view';

jest.mock('./use_unified_search');
jest.mock('./use_hosts_view');

const mockUseUnifiedSearchContext = useUnifiedSearchContext as jest.MockedFunction<
  typeof useUnifiedSearchContext
>;
const mockUseHostsViewContext = useHostsViewContext as jest.MockedFunction<
  typeof useHostsViewContext
>;

const HOST_NAME = 'host-0';
const DATE_RANGE = { from: 'now-15m', to: 'now' };

const hasAlertStatusTerm = (query: object, status: AlertStatus): boolean =>
  JSON.stringify(query).includes(
    JSON.stringify({
      term: {
        [ALERT_STATUS]: {
          value: status,
        },
      },
    })
  );

describe('useAlertsQueryImpl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseHostsViewContext.mockReturnValue({
      hostNodes: [{ name: HOST_NAME }],
    } as ReturnType<typeof useHostsViewContext>);
    mockUseUnifiedSearchContext.mockReturnValue({
      searchCriteria: { dateRange: DATE_RANGE },
    } as ReturnType<typeof useUnifiedSearchContext>);
  });

  it('omits a status filter when the selected status is all', () => {
    const { result } = renderHook(() => useAlertsQueryImpl());

    expect(result.current.alertStatus).toBe('all');
    expect(hasAlertStatusTerm(result.current.alertsEsQueryByStatus, 'active')).toBe(false);
    expect(hasAlertStatusTerm(result.current.alertsEsQueryByStatus, 'recovered')).toBe(false);
    expect(hasAlertStatusTerm(result.current.alertsEsQueryByStatus, 'untracked')).toBe(false);
    expect(JSON.stringify(result.current.alertsEsQueryByStatus)).toContain(HOST_NAME);
  });

  it.each([
    ['active', ALERT_STATUS_ACTIVE],
    ['recovered', ALERT_STATUS_RECOVERED],
    ['untracked', ALERT_STATUS_UNTRACKED],
  ] as const)('includes a %s status term in alertsEsQueryByStatus', (status, expectedValue) => {
    const { result } = renderHook(() => useAlertsQueryImpl());

    act(() => {
      result.current.setAlertStatus(status);
    });

    expect(result.current.alertStatus).toBe(status);
    expect(hasAlertStatusTerm(result.current.alertsEsQueryByStatus, expectedValue)).toBe(true);
    expect(JSON.stringify(result.current.alertsEsQueryByStatus)).toContain(HOST_NAME);
  });
});
