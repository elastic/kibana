/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook } from '@testing-library/react';
import { TestProviders } from '../../common/mock';
import { createStartServicesMock } from '../../common/lib/kibana/kibana_react.mock';
import type { StartServices } from '../../types';
import { ENTITY_ANALYTICS_WATCHLIST_MANUAL_ENTITIES_FLAG } from '../../../common/constants';
import { useWatchlistManualEntitiesEnabled } from './use_watchlist_manual_entities_enabled';

const setup = (resolve: (flag: string, fallback: boolean) => boolean) => {
  const startServices = createStartServicesMock();
  jest.mocked(startServices.featureFlags.useBooleanValue).mockImplementation(resolve);
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <TestProviders startServices={startServices as StartServices}>{children}</TestProviders>
  );
  const { result } = renderHook(() => useWatchlistManualEntitiesEnabled(), { wrapper });
  return { result, startServices };
};

describe('useWatchlistManualEntitiesEnabled', () => {
  it('is on when the deployment turns the flag on', () => {
    const { result } = setup((flag, fallback) =>
      flag === ENTITY_ANALYTICS_WATCHLIST_MANUAL_ENTITIES_FLAG ? true : fallback
    );

    expect(result.current).toBe(true);
  });

  it('is off by default: the fallback a deployment without the flag resolves to', () => {
    const { result, startServices } = setup((_, fallback) => fallback);

    expect(result.current).toBe(false);
    expect(startServices.featureFlags.useBooleanValue).toHaveBeenCalledWith(
      'securitySolution.entityAnalyticsWatchlistManualEntities',
      false
    );
  });
});
