/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { FC, PropsWithChildren } from 'react';
import { renderHook } from '@testing-library/react';
import { ENTITY_ANALYTICS_TABLE_ID } from '../components/home/constants';
import { getEntityAnalyticsNewHomeScopeId } from '../common/alert_time_range_overrides';
import { EntityFlyoutTimeRangeProvider } from './use_entity_flyout_time_range';
import { useAlertTimeRange } from './use_alert_time_range';

jest.mock('../../common/containers/use_global_time', () => ({
  useGlobalTime: jest.fn(() => ({ from: 'global-from', to: 'global-to' })),
}));

const withFlyoutScope = (scopeId: string): FC<PropsWithChildren> => {
  const Wrapper: FC<PropsWithChildren> = ({ children }) => (
    <EntityFlyoutTimeRangeProvider scopeId={scopeId}>{children}</EntityFlyoutTimeRangeProvider>
  );
  return Wrapper;
};

describe('useAlertTimeRange', () => {
  it('falls back to the global time range without a scope override or flyout range', () => {
    const { result } = renderHook(() => useAlertTimeRange('alerts-page'));

    expect(result.current).toEqual({ from: 'global-from', to: 'global-to' });
  });

  it('uses the scope override when registered', () => {
    const { result } = renderHook(() => useAlertTimeRange(ENTITY_ANALYTICS_TABLE_ID));

    expect(result.current).toEqual({ from: 'now-30d', to: 'now' });
  });

  it('uses the enclosing flyout time range when the consumer has no scope (e.g. generic insights)', () => {
    const { result } = renderHook(() => useAlertTimeRange(undefined), {
      wrapper: withFlyoutScope(getEntityAnalyticsNewHomeScopeId('7d')),
    });

    expect(result.current).toEqual({ from: 'now-7d', to: 'now' });
  });

  it('lets a scope override win over the flyout time range', () => {
    const { result } = renderHook(() => useAlertTimeRange(ENTITY_ANALYTICS_TABLE_ID), {
      wrapper: withFlyoutScope(getEntityAnalyticsNewHomeScopeId('24h')),
    });

    expect(result.current).toEqual({ from: 'now-30d', to: 'now' });
  });
});
