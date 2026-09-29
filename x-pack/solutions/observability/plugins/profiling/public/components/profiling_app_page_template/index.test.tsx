/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { render } from '@testing-library/react';

vi.mock('react-router-dom', () => {
  const mocked = { useLocation: vi.fn() };
  return { ...mocked, default: mocked };
});
vi.mock('../../hooks/use_profiling_router');
vi.mock('../../hooks/use_default_time_range');
vi.mock('../contexts/profiling_dependencies/use_profiling_dependencies');
vi.mock('../contexts/back_navigation/use_back_navigation');
vi.mock('./primary_profiling_search_bar', () => {
  const mocked = {
    PrimaryProfilingSearchBar: () => null,
  };
  return { ...mocked, default: mocked };
});
vi.mock('@kbn/app-header', () => {
  const mocked = {
    AppHeader: () => null,
    SuppressChromeBackButton: () => null,
  };
  return { ...mocked, default: mocked };
});

import { useLocation } from 'react-router-dom';
import { useProfilingRouter } from '../../hooks/use_profiling_router';
import { useDefaultTimeRange } from '../../hooks/use_default_time_range';
import { useProfilingDependencies } from '../contexts/profiling_dependencies/use_profiling_dependencies';
import { useBackNavigation } from '../contexts/back_navigation/use_back_navigation';
import { ProfilingAppPageTemplate } from '.';

describe('ProfilingAppPageTemplate', () => {
  const mockLink = vi.fn().mockReturnValue('/mock-url');

  beforeAll(() => {
    // jsdom does not implement window.scrollTo; silence the "not implemented" warning.
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });
  const mockDefaultTimeRange = { from: 'now-30m', to: 'now-5m' };

  beforeEach(() => {
    vi.clearAllMocks();

    mockLink.mockReturnValue('/mock-url');

    (useDefaultTimeRange as Mock).mockReturnValue(mockDefaultTimeRange);

    (useProfilingRouter as Mock).mockReturnValue({ link: mockLink });

    (useBackNavigation as Mock).mockReturnValue(undefined);

    (useProfilingDependencies as Mock).mockReturnValue({
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
    (useLocation as Mock).mockReturnValue({ search, pathname: '/stacktraces/executables' });
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
