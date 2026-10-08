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
jest.mock('../contexts/profiling_dependencies/use_profiling_dependencies');
jest.mock('../contexts/back_navigation/use_back_navigation');
jest.mock('../contexts/profiling_status/use_profiling_status');
jest.mock('./primary_profiling_search_bar', () => ({
  PrimaryProfilingSearchBar: jest.fn(() => null),
}));
jest.mock('@kbn/app-header', () => ({
  AppHeader: jest.fn(() => null),
  SuppressChromeBackButton: () => null,
}));
jest.mock('../contexts/profiling_schema/profiling_schema_context', () => ({
  ProfilingSchemaContextProvider: jest.fn(({ children }) => children),
}));
jest.mock('../schema_selector', () => ({
  SchemaSelector: jest.fn(() => null),
}));

import { useLocation } from 'react-router-dom';
import type { ProfilingStatus } from '@kbn/profiling-utils';
import { AppHeader } from '@kbn/app-header';
import { useProfilingRouter } from '../../hooks/use_profiling_router';
import { useDefaultTimeRange } from '../../hooks/use_default_time_range';
import { useProfilingDependencies } from '../contexts/profiling_dependencies/use_profiling_dependencies';
import { useBackNavigation } from '../contexts/back_navigation/use_back_navigation';
import { useProfilingStatus } from '../contexts/profiling_status/use_profiling_status';
import { ProfilingSchemaContextProvider } from '../contexts/profiling_schema/profiling_schema_context';
import { SchemaSelector } from '../schema_selector';
import { PrimaryProfilingSearchBar } from './primary_profiling_search_bar';
import {
  ProfilingAppPageTemplate,
  STORAGE_EXPLORER_NOT_AVAILABLE_TOOLTIP,
  STORAGE_EXPLORER_NOT_SET_UP_TOOLTIP,
} from '.';

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

  const mockProfilingStatus = (
    universalProfiling: Partial<Extract<ProfilingStatus, { isEnabled: true }>['universalProfiling']>
  ) =>
    (useProfilingStatus as jest.Mock).mockReturnValue({
      data: {
        isEnabled: true,
        otel: { isAvailable: true, hasData: true },
        universalProfiling: {
          isAvailable: true,
          hasSetup: true,
          hasData: true,
          hasLegacyData: false,
          ...universalProfiling,
        },
      },
    });

  beforeEach(() => {
    jest.clearAllMocks();

    mockLink.mockReturnValue('/mock-url');

    (useDefaultTimeRange as jest.Mock).mockReturnValue(mockDefaultTimeRange);

    (useProfilingRouter as jest.Mock).mockReturnValue({ link: mockLink });

    (useBackNavigation as jest.Mock).mockReturnValue(undefined);

    mockProfilingStatus({});

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

  const renderTemplate = (
    search: string,
    props: Partial<React.ComponentProps<typeof ProfilingAppPageTemplate>> = {}
  ) => {
    (useLocation as jest.Mock).mockReturnValue({ search, pathname: '/stacktraces/executables' });
    render(<ProfilingAppPageTemplate hideSearchBar {...props} />);
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

  describe('storage explorer button', () => {
    const getStorageExplorerItem = () => {
      const [[{ menu }]] = jest.mocked(AppHeader).mock.calls;
      return menu?.items?.find(({ id }) => id === 'storage-explorer');
    };

    it('is enabled when Universal Profiling is set up', () => {
      renderTemplate('');

      expect(getStorageExplorerItem()).toEqual(
        expect.objectContaining({ disableButton: false, tooltipContent: undefined })
      );
    });

    it('is disabled with a setup hint when Universal Profiling is not set up', () => {
      mockProfilingStatus({ hasSetup: false, hasData: false });

      renderTemplate('');

      expect(getStorageExplorerItem()).toEqual(
        expect.objectContaining({
          disableButton: true,
          tooltipContent: STORAGE_EXPLORER_NOT_SET_UP_TOOLTIP,
        })
      );
    });

    it('is disabled with a serverless note when Universal Profiling is not available', () => {
      mockProfilingStatus({ isAvailable: false, hasSetup: false, hasData: false });

      renderTemplate('');

      expect(getStorageExplorerItem()).toEqual(
        expect.objectContaining({
          disableButton: true,
          tooltipContent: STORAGE_EXPLORER_NOT_AVAILABLE_TOOLTIP,
        })
      );
    });
  });

  describe('schema selector', () => {
    it('provides the profiling schema for the search params of the page', () => {
      renderTemplate('?rangeFrom=now-1h&rangeTo=now-10m&kuery=host.name:my-host', {
        showSchemaSelector: true,
        children: <div />,
      });

      expect(jest.mocked(ProfilingSchemaContextProvider).mock.calls[0][0]).toEqual(
        expect.objectContaining({
          rangeFrom: 'now-1h',
          rangeTo: 'now-10m',
          kuery: 'host.name:my-host',
        })
      );
      expect(SchemaSelector).toHaveBeenCalled();
    });

    it('provides the default time range when the page has none', () => {
      renderTemplate('', { showSchemaSelector: true });

      expect(jest.mocked(ProfilingSchemaContextProvider).mock.calls[0][0]).toEqual(
        expect.objectContaining({
          rangeFrom: mockDefaultTimeRange.from,
          rangeTo: mockDefaultTimeRange.to,
          kuery: '',
        })
      );
    });

    it('passes the selected schema to the search bar', () => {
      renderTemplate('?rangeFrom=now-1h&rangeTo=now-10m&schema=otel', {
        hideSearchBar: false,
        showSchemaSelector: true,
      });

      expect(jest.mocked(PrimaryProfilingSearchBar).mock.calls[0][0]).toEqual({ schema: 'otel' });
    });

    it('does not pass a schema to the search bar of pages without the selector', () => {
      renderTemplate('?rangeFrom=now-1h&rangeTo=now-10m&schema=otel', { hideSearchBar: false });

      expect(jest.mocked(PrimaryProfilingSearchBar).mock.calls[0][0]).toEqual({
        schema: undefined,
      });
    });

    it('is not shown by default', () => {
      renderTemplate('?rangeFrom=now-1h&rangeTo=now-10m', { children: <div /> });

      expect(ProfilingSchemaContextProvider).not.toHaveBeenCalled();
      expect(SchemaSelector).not.toHaveBeenCalled();
    });
  });
});
