/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';

jest.mock('react-router-dom', () => ({ useLocation: jest.fn() }));
jest.mock('../../hooks/use_profiling_router');
jest.mock('../../hooks/use_default_time_range');
jest.mock('../../hooks/use_local_storage');
jest.mock('../contexts/profiling_dependencies/use_profiling_dependencies');
jest.mock('../contexts/profiling_setup_status/use_profiling_setup_status');
jest.mock('../contexts/back_navigation/use_back_navigation');
jest.mock('./primary_profiling_search_bar', () => ({
  PrimaryProfilingSearchBar: () => null,
}));
jest.mock('@kbn/app-header', () => ({
  AppHeader: () => null,
  SuppressChromeBackButton: () => null,
}));
jest.mock('@kbn/ui-callout', () => ({ KbnWarningCallout: () => null }));

import { useLocation } from 'react-router-dom';
import { useProfilingRouter } from '../../hooks/use_profiling_router';
import { useDefaultTimeRange } from '../../hooks/use_default_time_range';
import { useLocalStorage } from '../../hooks/use_local_storage';
import { useProfilingDependencies } from '../contexts/profiling_dependencies/use_profiling_dependencies';
import { useProfilingSetupStatus } from '../contexts/profiling_setup_status/use_profiling_setup_status';
import { useBackNavigation } from '../contexts/back_navigation/use_back_navigation';
import { ProfilingAppPageTemplate } from '.';

describe('ProfilingAppPageTemplate', () => {
  const mockLink = jest.fn().mockReturnValue('/mock-url');

  beforeAll(() => {
    // jsdom does not implement window.scrollTo; silence the "not implemented" warning.
    jest.spyOn(window, 'scrollTo').mockImplementation(() => {});
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });
  const mockDefaultTimeRange = { from: 'now-30m', to: 'now-5m' };

  beforeEach(() => {
    jest.clearAllMocks();

    mockLink.mockReturnValue('/mock-url');

    (useDefaultTimeRange as jest.Mock).mockReturnValue(mockDefaultTimeRange);

    (useProfilingRouter as jest.Mock).mockReturnValue({ link: mockLink });

    (useLocalStorage as jest.Mock).mockReturnValue([false, jest.fn()]);

    (useProfilingSetupStatus as jest.Mock).mockReturnValue({ profilingSetupStatus: undefined });

    (useBackNavigation as jest.Mock).mockReturnValue(undefined);

    (useProfilingDependencies as jest.Mock).mockReturnValue({
      start: {
        observabilityShared: {
          navigation: {
            PageTemplate: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
          },
        },
      },
    });
  });

  const renderTemplate = (search: string) => {
    (useLocation as jest.Mock).mockReturnValue({ search, pathname: '/stacktraces/executables' });
    render(<ProfilingAppPageTemplate hideSearchBar />);
  };

  // Finds the query object from the router.link call for the storage-explorer path.
  const getStorageExplorerQuery = () => {
    const call = mockLink.mock.calls.find(([path]) => path === '/storage-explorer');
    return call?.[1]?.query as Record<string, string> | undefined;
  };

  describe('rangeFrom/rangeTo selection for the storage-explorer link', () => {
    it('falls back to the default time range when both params are absent', () => {
      renderTemplate('');

      expect(getStorageExplorerQuery()).toMatchObject({
        rangeFrom: mockDefaultTimeRange.from,
        rangeTo: mockDefaultTimeRange.to,
      });
    });

    it('falls back to the default time range when both params are empty strings', () => {
      renderTemplate('?rangeFrom=&rangeTo=');

      expect(getStorageExplorerQuery()).toMatchObject({
        rangeFrom: mockDefaultTimeRange.from,
        rangeTo: mockDefaultTimeRange.to,
      });
    });

    it('uses the URL values when both params are present', () => {
      renderTemplate('?rangeFrom=now-1h&rangeTo=now-10m');

      expect(getStorageExplorerQuery()).toMatchObject({
        rangeFrom: 'now-1h',
        rangeTo: 'now-10m',
      });
    });

    it('falls back per bound when only rangeFrom is missing', () => {
      renderTemplate('?rangeTo=now-10m');

      expect(getStorageExplorerQuery()).toMatchObject({
        rangeFrom: mockDefaultTimeRange.from,
        rangeTo: 'now-10m',
      });
    });

    it('falls back per bound when only rangeTo is missing', () => {
      renderTemplate('?rangeFrom=now-1h');

      expect(getStorageExplorerQuery()).toMatchObject({
        rangeFrom: 'now-1h',
        rangeTo: mockDefaultTimeRange.to,
      });
    });
  });
});
