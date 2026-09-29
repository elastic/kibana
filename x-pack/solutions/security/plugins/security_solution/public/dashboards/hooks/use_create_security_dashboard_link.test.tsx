/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { act, waitFor, renderHook } from '@testing-library/react';
import { useKibana } from '../../common/lib/kibana';
import { useCreateSecurityDashboardLink } from './use_create_security_dashboard_link';
import { DashboardContextProvider } from '../context/dashboard_context';
import { getTagsByName } from '../../common/containers/tags/api';
import React from 'react';
import { TestProviders } from '../../common/mock';

vi.mock('@kbn/security-solution-navigation/src/context');
vi.mock('../../common/lib/kibana', () => {
  const mocked = {
    useKibana: vi.fn(),
  };
  return { ...mocked, default: mocked };
});
vi.mock('../../common/containers/tags/api');
vi.mock('../../common/lib/apm/use_track_http_request');
vi.mock('../../common/components/link_to', () => {
  const mocked = {
    useGetSecuritySolutionUrl: vi
      .fn()
      .mockReturnValue(vi.fn().mockReturnValue('/app/security/dashboards/create')),
  };
  return { ...mocked, default: mocked };
});

const renderUseCreateSecurityDashboardLink = () =>
  renderHook(() => useCreateSecurityDashboardLink(), {
    wrapper: ({ children }: React.PropsWithChildren<{}>) => (
      <TestProviders>
        <DashboardContextProvider>{children}</DashboardContextProvider>
      </TestProviders>
    ),
  });

describe('useCreateSecurityDashboardLink', () => {
  beforeAll(() => {
    (useKibana as Mock).mockReturnValue({
      services: {
        savedObjectsTagging: {
          create: vi.fn(),
        },
        http: { get: vi.fn() },
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('useSecurityDashboardsTableItems', () => {
    it('should fetch Security Solution tags when renders', async () => {
      renderUseCreateSecurityDashboardLink();

      await waitFor(() => {
        expect(getTagsByName).toHaveBeenCalledTimes(1);
      });
    });

    it('should return a memoized value when rerendered', async () => {
      const { result, rerender } = renderUseCreateSecurityDashboardLink();

      const result1 = result.current;
      act(() => rerender());
      const result2 = result.current;

      await waitFor(() => {
        expect(result1).toEqual(result2);
      });
    });

    it('should not re-request tag id when re-rendered', async () => {
      const { rerender } = renderUseCreateSecurityDashboardLink();

      await waitFor(() => {
        expect(getTagsByName).toHaveBeenCalledTimes(1);
      });

      act(() => rerender());

      await waitFor(() => {
        expect(getTagsByName).toHaveBeenCalledTimes(1);
      });
    });

    it('should return isLoading while requesting', async () => {
      const { result } = renderUseCreateSecurityDashboardLink();

      await waitFor(() => {
        expect(result.current.isLoading).toEqual(true);
        expect(result.current.url).toEqual('/app/security/dashboards/create');
      });

      await waitFor(() => {
        expect(result.current.isLoading).toEqual(false);
        expect(result.current.url).toEqual('/app/security/dashboards/create');
      });
    });
  });
});
