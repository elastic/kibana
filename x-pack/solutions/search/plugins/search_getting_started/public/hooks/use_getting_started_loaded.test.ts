/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { renderHook } from '@testing-library/react';
import { GETTING_STARTED_SESSIONSTORAGE_KEY } from '@kbn/search-shared-ui';
import { useGettingStartedLoaded } from './use_getting_started_loaded';
import { useUsageTracker } from '../contexts/usage_tracker_context';
import { AnalyticsEvents } from '../../common';

vi.mock('../contexts/usage_tracker_context', () => {
  const mocked = {
    useUsageTracker: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

const mockUseUsageTracker = useUsageTracker as Mock;

describe('useGettingStartedLoaded', () => {
  const mockLoad = vi.fn();

  beforeEach(() => {
    sessionStorage.clear();
    mockLoad.mockReset();
    mockUseUsageTracker.mockReturnValue({ load: mockLoad, click: vi.fn(), count: vi.fn() });
  });

  it('fires gettingStartedLoaded by default', () => {
    renderHook(() => useGettingStartedLoaded());

    expect(mockLoad).toHaveBeenCalledWith(AnalyticsEvents.gettingStartedLoaded);
  });

  it('fires a custom event when one is provided', () => {
    renderHook(() => useGettingStartedLoaded(AnalyticsEvents.gettingStartedChatLoaded));

    expect(mockLoad).toHaveBeenCalledWith(AnalyticsEvents.gettingStartedChatLoaded);
  });

  it('sets the getting started session storage key', () => {
    renderHook(() => useGettingStartedLoaded());

    expect(sessionStorage.getItem(GETTING_STARTED_SESSIONSTORAGE_KEY)).toBe('true');
  });
});
