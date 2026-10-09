/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { ALERT_INSTANCE_ID, ALERT_RULE_UUID } from '@kbn/rule-data-utils';
import { getAlertSnoozeStateByRule } from '@kbn/response-ops-alerts-apis/apis/get_muted_alerts_instances_by_rule';
import type { TopAlert } from '../../../typings/alerts';
import { useKibana } from '../../../utils/kibana_react';
import { useAlertSnoozeState } from './use_alert_snooze_state';

jest.mock('../../../utils/kibana_react');
jest.mock('@kbn/response-ops-alerts-apis/apis/get_muted_alerts_instances_by_rule');

const mockGetAlertSnoozeStateByRule = getAlertSnoozeStateByRule as jest.MockedFunction<
  typeof getAlertSnoozeStateByRule
>;

const RULE_ID = 'rule-1';
const INSTANCE_ID = 'instance-1';

const http = { post: jest.fn() };
const notifications = { toasts: { addError: jest.fn(), addSuccess: jest.fn() } };

const buildAlert = (ruleId?: string, instanceId?: string): TopAlert =>
  ({
    fields: {
      ...(ruleId != null && { [ALERT_RULE_UUID]: ruleId }),
      ...(instanceId != null && { [ALERT_INSTANCE_ID]: instanceId }),
    },
  } as unknown as TopAlert);

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const snoozedInstance = {
  instanceId: INSTANCE_ID,
  snoozedAt: '2026-05-15T00:00:00.000Z',
  snoozedBy: 'user1',
  expiresAt: '2026-05-16T00:00:00.000Z',
};

beforeEach(() => {
  jest.clearAllMocks();
  (useKibana as jest.Mock).mockReturnValue({ services: { http, notifications } });
});

describe('useAlertSnoozeState', () => {
  it('does not query and returns empty state when alert is null', async () => {
    const { result } = renderHook(() => useAlertSnoozeState(null), { wrapper: createWrapper() });

    expect(result.current).toEqual(
      expect.objectContaining({
        ruleId: undefined,
        instanceId: undefined,
        isMuted: false,
        isSnoozed: false,
        snoozedInstance: undefined,
      })
    );
    expect(mockGetAlertSnoozeStateByRule).not.toHaveBeenCalled();
  });

  it('does not query when the instance id is missing', () => {
    renderHook(() => useAlertSnoozeState(buildAlert(RULE_ID, undefined)), {
      wrapper: createWrapper(),
    });

    expect(mockGetAlertSnoozeStateByRule).not.toHaveBeenCalled();
  });

  it('queries with the alert rule id and exposes ruleId/instanceId', async () => {
    mockGetAlertSnoozeStateByRule.mockResolvedValue({ data: [] });

    const { result } = renderHook(() => useAlertSnoozeState(buildAlert(RULE_ID, INSTANCE_ID)), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(mockGetAlertSnoozeStateByRule).toHaveBeenCalledWith(
        expect.objectContaining({ http, ruleIds: [RULE_ID] })
      );
    });

    expect(result.current.ruleId).toBe(RULE_ID);
    expect(result.current.instanceId).toBe(INSTANCE_ID);
    expect(result.current.isMuted).toBe(false);
    expect(result.current.isSnoozed).toBe(false);
    expect(result.current.snoozedInstance).toBeUndefined();
  });

  it('reports the alert as muted when the instance is in mutedAlertIds', async () => {
    mockGetAlertSnoozeStateByRule.mockResolvedValue({
      data: [{ id: RULE_ID, mutedAlertIds: [INSTANCE_ID], snoozedInstances: [] }],
    });

    const { result } = renderHook(() => useAlertSnoozeState(buildAlert(RULE_ID, INSTANCE_ID)), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isMuted).toBe(true));
    expect(result.current.isSnoozed).toBe(false);
    expect(result.current.snoozedInstance).toBeUndefined();
  });

  it('reports the alert as snoozed and returns the snoozed instance', async () => {
    mockGetAlertSnoozeStateByRule.mockResolvedValue({
      data: [{ id: RULE_ID, mutedAlertIds: [], snoozedInstances: [snoozedInstance] }],
    });

    const { result } = renderHook(() => useAlertSnoozeState(buildAlert(RULE_ID, INSTANCE_ID)), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSnoozed).toBe(true));
    expect(result.current.isMuted).toBe(false);
    expect(result.current.snoozedInstance).toEqual(snoozedInstance);
  });

  it('reports no state for an instance that belongs to a different rule instance', async () => {
    mockGetAlertSnoozeStateByRule.mockResolvedValue({
      data: [
        {
          id: RULE_ID,
          mutedAlertIds: ['other-instance'],
          snoozedInstances: [{ ...snoozedInstance, instanceId: 'other-instance' }],
        },
      ],
    });

    const { result } = renderHook(() => useAlertSnoozeState(buildAlert(RULE_ID, INSTANCE_ID)), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(mockGetAlertSnoozeStateByRule).toHaveBeenCalled());
    expect(result.current.isMuted).toBe(false);
    expect(result.current.isSnoozed).toBe(false);
    expect(result.current.snoozedInstance).toBeUndefined();
  });

  it('exposes a refetch function that triggers the API again', async () => {
    mockGetAlertSnoozeStateByRule.mockResolvedValue({ data: [] });

    const { result } = renderHook(() => useAlertSnoozeState(buildAlert(RULE_ID, INSTANCE_ID)), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(mockGetAlertSnoozeStateByRule).toHaveBeenCalledTimes(1));

    await result.current.refetch();

    expect(mockGetAlertSnoozeStateByRule).toHaveBeenCalledTimes(2);
  });
});
