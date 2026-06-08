/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { of, throwError, from } from 'rxjs';
import { useEntityEuidFromAlerts } from './use_entity_euid_from_alerts';
import { useKibana } from '../../../../../common/lib/kibana';
import { useEntityStoreEuidApi } from '@kbn/entity-store/public';

jest.mock('../../../../../common/lib/kibana');
jest.mock('@kbn/entity-store/public', () => ({
  useEntityStoreEuidApi: jest.fn(),
}));

describe('useEntityEuidFromAlerts', () => {
  const searchMock: jest.Mock = jest.fn();
  const getEuidRuntimeMappingMock: jest.Mock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (useKibana as jest.Mock).mockReturnValue({
      services: {
        data: {
          search: { search: searchMock },
        },
      },
    });

    (useEntityStoreEuidApi as jest.Mock).mockReturnValue({
      euid: {
        painless: {
          getEuidRuntimeMapping: getEuidRuntimeMappingMock,
        },
      },
    });
  });

  const defaultProps = {
    alertIds: ['alert-1', 'alert-2'],
    fieldName: 'host.name',
    fieldValue: 'test-host',
    enabled: true,
  };

  it('returns undefined euid and false isLoading when alertIds is empty', () => {
    const { result } = renderHook(() => useEntityEuidFromAlerts({ ...defaultProps, alertIds: [] }));

    expect(result.current).toEqual({ euid: undefined, isLoading: false });
    expect(searchMock).not.toHaveBeenCalled();
  });

  it('returns undefined euid and false isLoading when enabled is false', () => {
    const { result } = renderHook(() =>
      useEntityEuidFromAlerts({ ...defaultProps, enabled: false })
    );

    expect(result.current).toEqual({ euid: undefined, isLoading: false });
    expect(searchMock).not.toHaveBeenCalled();
  });

  it('returns undefined euid and false isLoading when euidApi is null or undefined', () => {
    (useEntityStoreEuidApi as jest.Mock).mockReturnValueOnce(null);

    const { result } = renderHook(() => useEntityEuidFromAlerts(defaultProps));

    expect(result.current).toEqual({ euid: undefined, isLoading: false });
    expect(searchMock).not.toHaveBeenCalled();
  });

  it('fetches and returns the correct EUID when a matching alert is found', async () => {
    searchMock.mockReturnValueOnce(
      of({
        rawResponse: {
          hits: {
            hits: [
              {
                fields: { 'host.name': ['other-host'], entity_id: ['host:other-id'] },
              },
              {
                fields: { 'host.name': ['test-host'], entity_id: ['host:test-id'] },
              },
            ],
          },
        },
      })
    );

    const { result } = renderHook(() => useEntityEuidFromAlerts(defaultProps));

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.euid).toBe('host:test-id');
    expect(searchMock).toHaveBeenCalledTimes(1);
    expect(getEuidRuntimeMappingMock).toHaveBeenCalledWith('host');
  });

  it('returns undefined EUID when no alert matches the field value', async () => {
    searchMock.mockReturnValueOnce(
      of({
        rawResponse: {
          hits: {
            hits: [
              {
                fields: { 'host.name': ['other-host-1'], entity_id: ['host:other-id-1'] },
              },
              {
                fields: { 'host.name': ['other-host-2'], entity_id: ['host:other-id-2'] },
              },
            ],
          },
        },
      })
    );

    const { result } = renderHook(() => useEntityEuidFromAlerts(defaultProps));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.euid).toBeUndefined();
  });

  it('handles field values as single string correctly', async () => {
    searchMock.mockReturnValueOnce(
      of({
        rawResponse: {
          hits: {
            hits: [
              {
                fields: { 'host.name': 'test-host', entity_id: ['host:test-id'] },
              },
            ],
          },
        },
      })
    );

    const { result } = renderHook(() => useEntityEuidFromAlerts(defaultProps));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.euid).toBe('host:test-id');
  });

  it('returns undefined when the ES query throws and swallows the error', async () => {
    searchMock.mockReturnValueOnce(throwError(() => new Error('ES failure')));

    const { result } = renderHook(() => useEntityEuidFromAlerts(defaultProps));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.euid).toBeUndefined();
  });

  it('cancels the state update if unmounted during fetch', async () => {
    let resolvePromise: (value: unknown) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    // Use an observable that resolves when the promise resolves
    searchMock.mockReturnValueOnce(from(promise));

    const { result, unmount } = renderHook(() => useEntityEuidFromAlerts(defaultProps));

    expect(result.current.isLoading).toBe(true);

    unmount();

    // Resolve the promise after unmount
    resolvePromise!({ rawResponse: { hits: { hits: [] } } });

    // Wait for the promise chain to settle
    await Promise.resolve();

    // Since the hook was unmounted, the cancelled flag should prevent the
    // finally block from setting isLoading to false.
    expect(result.current.isLoading).toBe(true);
  });
});
