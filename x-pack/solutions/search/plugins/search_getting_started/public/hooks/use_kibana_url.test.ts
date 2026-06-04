/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { getFallbackKibanaUrl, useKibanaUrl } from './use_kibana_url';
import { useKibana } from './use_kibana';
import { useSpaceId } from './use_space_id';

jest.mock('./use_kibana');
jest.mock('./use_space_id');

const mockUseKibana = useKibana as jest.Mock;
const mockUseSpaceId = useSpaceId as jest.Mock;

const mockHttp = (publicBaseUrl: string | undefined, serverBasePath = '') => ({
  basePath: {
    publicBaseUrl,
    serverBasePath,
    get: jest.fn().mockReturnValue('/base'),
  },
});

describe('getFallbackKibanaUrl', () => {
  it('returns window.location.origin combined with the base path', () => {
    const http = { basePath: { get: jest.fn().mockReturnValue('/base') } } as any;
    expect(getFallbackKibanaUrl(http)).toBe(`${window.location.origin}/base`);
  });

  it('handles an empty base path', () => {
    const http = { basePath: { get: jest.fn().mockReturnValue('') } } as any;
    expect(getFallbackKibanaUrl(http)).toBe(window.location.origin);
  });
});

describe('useKibanaUrl', () => {
  describe('base URL priority', () => {
    it('prefers publicBaseUrl over cloud.kibanaUrl', () => {
      mockUseKibana.mockReturnValue({
        services: {
          http: mockHttp('https://public.example.com'),
          cloud: { kibanaUrl: 'https://cloud.example.com' },
        },
      });
      mockUseSpaceId.mockReturnValue('default');

      const { result } = renderHook(() => useKibanaUrl());

      expect(result.current.kibanaUrl).toBe('https://public.example.com');
    });

    it('falls back to cloud.kibanaUrl when publicBaseUrl is not set', () => {
      mockUseKibana.mockReturnValue({
        services: {
          http: mockHttp(undefined),
          cloud: { kibanaUrl: 'https://cloud.example.com' },
        },
      });
      mockUseSpaceId.mockReturnValue('default');

      const { result } = renderHook(() => useKibanaUrl());

      expect(result.current.kibanaUrl).toBe('https://cloud.example.com');
    });

    it('falls back to getFallbackKibanaUrl when neither publicBaseUrl nor cloud are available', () => {
      mockUseKibana.mockReturnValue({
        services: {
          http: mockHttp(undefined),
          cloud: undefined,
        },
      });
      mockUseSpaceId.mockReturnValue('default');

      const { result } = renderHook(() => useKibanaUrl());

      expect(result.current.kibanaUrl).toBe(`${window.location.origin}/base`);
    });
  });

  describe('space path handling', () => {
    it('appends the space path when the base URL has no explicit space identifier', () => {
      mockUseKibana.mockReturnValue({
        services: {
          http: mockHttp('https://kibana.example.com'),
          cloud: undefined,
        },
      });
      mockUseSpaceId.mockReturnValue('my-space');

      const { result } = renderHook(() => useKibanaUrl());

      expect(result.current.kibanaUrl).toBe('https://kibana.example.com/s/my-space');
    });

    it('returns the base URL unchanged when it already contains an explicit space identifier', () => {
      mockUseKibana.mockReturnValue({
        services: {
          http: mockHttp('https://kibana.example.com/s/existing-space'),
          cloud: undefined,
        },
      });
      mockUseSpaceId.mockReturnValue('existing-space');

      const { result } = renderHook(() => useKibanaUrl());

      expect(result.current.kibanaUrl).toBe('https://kibana.example.com/s/existing-space');
    });

    it('does not append a space path when spaceId is undefined', () => {
      mockUseKibana.mockReturnValue({
        services: {
          http: mockHttp('https://kibana.example.com'),
          cloud: undefined,
        },
      });
      mockUseSpaceId.mockReturnValue(undefined);

      const { result } = renderHook(() => useKibanaUrl());

      expect(result.current.kibanaUrl).toBe('https://kibana.example.com');
    });

    it('does not append a path for the default space', () => {
      mockUseKibana.mockReturnValue({
        services: {
          http: mockHttp('https://kibana.example.com'),
          cloud: undefined,
        },
      });
      mockUseSpaceId.mockReturnValue('default');

      const { result } = renderHook(() => useKibanaUrl());

      expect(result.current.kibanaUrl).toBe('https://kibana.example.com');
    });
  });
});
