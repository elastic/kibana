/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useServiceAccountName } from './use_service_account_name';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: jest.fn(),
}));

const mockUseKibana = jest.mocked(useKibana);
const httpGet = jest.fn();

describe('useServiceAccountName', () => {
  beforeEach(() => {
    httpGet.mockReset();
    mockUseKibana.mockReturnValue({ services: { http: { get: httpGet } } } as never);
  });

  it('returns undefined when no service account id is given', () => {
    const { result } = renderHook(() => useServiceAccountName());

    expect(result.current).toBeUndefined();
  });

  it('does not request an account when no id is given', () => {
    renderHook(() => useServiceAccountName());

    expect(httpGet).not.toHaveBeenCalled();
  });

  it('returns the account name for the stored id', async () => {
    httpGet.mockResolvedValue({ id: 'kibana/az-worker-1', name: 'az-worker-1' });

    const { result } = renderHook(() => useServiceAccountName('kibana/az-worker-1'));

    await waitFor(() => expect(result.current).toBe('az-worker-1'));
  });

  it('requests the encoded service account path', async () => {
    httpGet.mockResolvedValue({ id: 'kibana/az-worker-1', name: 'az-worker-1' });

    renderHook(() => useServiceAccountName('kibana/az-worker-1'));

    await waitFor(() =>
      expect(httpGet).toHaveBeenCalledWith(
        '/internal/security/service_account/kibana%2Faz-worker-1'
      )
    );
  });

  it('returns undefined when the lookup fails', async () => {
    httpGet.mockRejectedValue(new Error('forbidden'));

    const { result } = renderHook(() => useServiceAccountName('account-a'));
    await act(async () => {
      await httpGet.mock.results[0]?.value.catch(() => undefined);
    });

    expect(result.current).toBeUndefined();
  });

  it('returns undefined when the response id does not match', async () => {
    httpGet.mockResolvedValue({ id: 'other', name: 'Other' });

    const { result } = renderHook(() => useServiceAccountName('account-a'));
    await act(async () => {
      await httpGet.mock.results[0]?.value;
    });

    expect(result.current).toBeUndefined();
  });

  it('returns the name for the latest id when an earlier lookup resolves late', async () => {
    let resolveFirst: (account: { id: string; name: string }) => void = () => {};
    httpGet.mockImplementation((path: string) => {
      if (path.endsWith(encodeURIComponent('account-a'))) {
        return new Promise((resolve) => {
          resolveFirst = resolve;
        });
      }
      return Promise.resolve({ id: 'account-b', name: 'Bee' });
    });

    const { result, rerender } = renderHook(({ id }: { id: string }) => useServiceAccountName(id), {
      initialProps: { id: 'account-a' },
    });
    rerender({ id: 'account-b' });
    await waitFor(() => {
      if (result.current !== 'Bee') {
        throw new Error('waiting for the latest account');
      }
    });
    await act(async () => {
      resolveFirst({ id: 'account-a', name: 'Aye' });
    });

    expect(result.current).toBe('Bee');
  });
});
