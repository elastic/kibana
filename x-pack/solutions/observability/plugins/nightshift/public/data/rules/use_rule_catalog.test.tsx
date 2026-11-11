/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useKibana } from '../../hooks/use_kibana';
import { useRuleCatalog } from './use_rule_catalog';

jest.mock('../../hooks/use_kibana');

const post = jest.fn();
const get = jest.fn();

const renderCatalog = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(() => useRuleCatalog(), { wrapper });
};

const httpError = (status: number) =>
  Object.assign(new Error(`HTTP ${status}`), {
    name: 'HttpFetchError',
    request: {},
    response: { status },
  });

describe('useRuleCatalog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useKibana as jest.Mock).mockReturnValue({ services: { http: { post, get } } });
    post.mockResolvedValue({
      data: [
        { name: 'CPU', tags: ['infra'], id: '1' },
        { name: 'Disk', tags: [], id: '2' },
      ],
      total: 2,
    });
    get.mockResolvedValue({ items: [], total: 0 });
  });

  it('loads Observability rules with their tags', async () => {
    const { result } = renderCatalog();

    await waitFor(() =>
      expect(result.current.data).toEqual([
        { name: 'CPU', tags: ['infra'] },
        { name: 'Disk', tags: [] },
      ])
    );
    expect(post).toHaveBeenCalledWith(
      '/internal/alerting/rules/_find',
      expect.objectContaining({
        body: expect.stringContaining('"rule_type_ids":["apm.error_rate"'),
      })
    );
  });

  it('adds the universal rules that create alerts, with their tags', async () => {
    get.mockResolvedValue({
      items: [{ id: 'v2-1', metadata: { name: 'Checkout errors', tags: ['prod'] } }],
      total: 1,
    });

    const { result } = renderCatalog();

    await waitFor(() =>
      expect(result.current.data).toEqual([
        { name: 'CPU', tags: ['infra'] },
        { name: 'Disk', tags: [] },
        { name: 'Checkout errors', tags: ['prod'] },
      ])
    );
    expect(get).toHaveBeenCalledWith(
      '/api/alerting/v2/rules',
      expect.objectContaining({ query: expect.objectContaining({ filter: 'kind: alert' }) })
    );
  });

  it('gives universal rules without tags an empty tag list', async () => {
    get.mockResolvedValue({
      items: [
        { metadata: { name: 'Null tags', tags: null } },
        { metadata: { name: 'Missing tags' } },
      ],
      total: 2,
    });

    const { result } = renderCatalog();

    await waitFor(() =>
      expect(result.current.data).toEqual([
        { name: 'CPU', tags: ['infra'] },
        { name: 'Disk', tags: [] },
        { name: 'Null tags', tags: [] },
        { name: 'Missing tags', tags: [] },
      ])
    );
  });

  it('reads every page of universal rules', async () => {
    const page = (prefix: string) =>
      Array.from({ length: 100 }, (_, index) => ({
        metadata: { name: `${prefix} ${index}`, tags: [] },
      }));
    get.mockResolvedValueOnce({ items: page('A'), total: 150 }).mockResolvedValueOnce({
      items: [{ metadata: { name: 'Last', tags: [] } }],
      total: 150,
    });

    const { result } = renderCatalog();

    await waitFor(() => expect(result.current.data).toHaveLength(103));
    expect(get).toHaveBeenCalledTimes(2);
    expect(get).toHaveBeenLastCalledWith(
      '/api/alerting/v2/rules',
      expect.objectContaining({ query: expect.objectContaining({ page: 2 }) })
    );
  });

  it('keeps the Observability rules when the user cannot read universal rules', async () => {
    get.mockRejectedValue(httpError(403));

    const { result } = renderCatalog();

    await waitFor(() => expect(result.current.data).toHaveLength(2));
    expect(result.current.isError).toBe(false);
  });

  it('keeps the Observability rules when universal alerting is turned off', async () => {
    get.mockRejectedValue(httpError(503));

    const { result } = renderCatalog();

    await waitFor(() => expect(result.current.data).toHaveLength(2));
    expect(result.current.isError).toBe(false);
  });

  it('keeps the universal rules when the user cannot read classic rules', async () => {
    post.mockRejectedValue(httpError(403));
    get.mockResolvedValue({
      items: [{ metadata: { name: 'Checkout errors', tags: ['prod'] } }],
      total: 1,
    });

    const { result } = renderCatalog();

    await waitFor(() =>
      expect(result.current.data).toEqual([{ name: 'Checkout errors', tags: ['prod'] }])
    );
    expect(result.current.isError).toBe(false);
  });

  it('reports an error when loading universal rules fails for another reason', async () => {
    get.mockRejectedValue(httpError(500));

    const { result } = renderCatalog();

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
