/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { renderHook } from '@testing-library/react';
import { useFetchEndpointPackageFreshness } from './use_fetch_endpoint_package_freshness';

const mockHttpGet = vi.fn();

vi.mock('../../../../../../common/lib/kibana', () => {
      const mocked = {
      useKibana: () => ({
        services: { http: { get: mockHttpGet } },
      }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('@kbn/react-query', () => {
      const mocked = {
      useQuery: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../../../services/policies/ingest', () => {
      const mocked = {
      sendGetEndpointSecurityPackage: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

const mockUseQuery = (await vi.importMock('@kbn/react-query')).useQuery;
const mockSendGetEndpointSecurityPackage = (await vi.importMock('../../../../../services/policies/ingest')).sendGetEndpointSecurityPackage;

describe('useFetchEndpointPackageFreshness', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseQuery.mockImplementation((_key: unknown, queryFn: unknown) => {
      if (typeof queryFn === 'function') {
        queryFn().catch(() => {});
      }
      return { data: undefined, isSuccess: false, isLoading: true };
    });
  });

  it('uses namespaced query key', () => {
    renderHook(() => useFetchEndpointPackageFreshness());
    expect(mockUseQuery).toHaveBeenCalledWith(
      ['workflowInsights', 'endpointPackageFreshness'],
      expect.any(Function),
      expect.any(Object)
    );
  });

  it('returns stale: true when installed is behind latest', async () => {
    mockSendGetEndpointSecurityPackage.mockResolvedValue({
      installationInfo: { version: '9.3.0' },
      latestVersion: '9.4.0',
    });

    let capturedResult: unknown;
    mockUseQuery.mockImplementation((_key: unknown, queryFn: unknown) => {
      if (typeof queryFn === 'function') {
        capturedResult = queryFn();
      }
      return { data: undefined, isSuccess: false };
    });

    renderHook(() => useFetchEndpointPackageFreshness());
    const result = await capturedResult;

    expect(result).toEqual({
      installedVersion: '9.3.0',
      latestVersion: '9.4.0',
      stale: true,
    });
  });

  it('returns stale: false when installed equals latest', async () => {
    mockSendGetEndpointSecurityPackage.mockResolvedValue({
      installationInfo: { version: '9.4.0' },
      latestVersion: '9.4.0',
    });

    let capturedResult: unknown;
    mockUseQuery.mockImplementation((_key: unknown, queryFn: unknown) => {
      if (typeof queryFn === 'function') {
        capturedResult = queryFn();
      }
      return { data: undefined, isSuccess: false };
    });

    renderHook(() => useFetchEndpointPackageFreshness());
    const result = await capturedResult;

    expect(result).toEqual({
      installedVersion: '9.4.0',
      latestVersion: '9.4.0',
      stale: false,
    });
  });

  it('returns stale: false when package is not installed', async () => {
    mockSendGetEndpointSecurityPackage.mockResolvedValue({
      installationInfo: undefined,
      latestVersion: '9.4.0',
    });

    let capturedResult: unknown;
    mockUseQuery.mockImplementation((_key: unknown, queryFn: unknown) => {
      if (typeof queryFn === 'function') {
        capturedResult = queryFn();
      }
      return { data: undefined, isSuccess: false };
    });

    renderHook(() => useFetchEndpointPackageFreshness());
    const result = await capturedResult;

    expect(result).toMatchObject({ installedVersion: null, stale: false });
  });

  it('returns stale: false when version strings are invalid semver', async () => {
    mockSendGetEndpointSecurityPackage.mockResolvedValue({
      installationInfo: { version: 'not-semver' },
      latestVersion: 'also-not-semver',
    });

    let capturedResult: unknown;
    mockUseQuery.mockImplementation((_key: unknown, queryFn: unknown) => {
      if (typeof queryFn === 'function') {
        capturedResult = queryFn();
      }
      return { data: undefined, isSuccess: false };
    });

    renderHook(() => useFetchEndpointPackageFreshness());
    const result = await capturedResult;

    expect(result).toMatchObject({ stale: false });
  });
});
