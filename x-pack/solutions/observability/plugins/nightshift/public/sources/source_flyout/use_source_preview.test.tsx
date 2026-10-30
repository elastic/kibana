/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { PROJECT_ROUTING } from '@kbn/cps-utils';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useKibana } from '../../hooks/use_kibana';
import { useTimefilter } from '../../hooks/use_timefilter';
import { useSourcePreview } from './use_source_preview';

jest.mock('../../hooks/use_kibana');
jest.mock('../../hooks/use_timefilter');

const esqlMock = jest.fn();
const useKibanaMock = useKibana as jest.MockedFunction<typeof useKibana>;
const useTimefilterMock = useTimefilter as jest.MockedFunction<typeof useTimefilter>;

const renderPreview = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(() => useSourcePreview({ esql: 'FROM service-*', runId: 1, refreshCount: 0 }), {
    wrapper,
  });
};

describe('useSourcePreview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useKibanaMock.mockReturnValue({
      services: { data: { search: { esql: esqlMock } } },
    } as never);
    useTimefilterMock.mockReturnValue({
      timeState: { start: 1000, end: 2000 },
    } as never);
  });

  // Nightshift never registers a CPS app access, so the picker sends no routing. Validation and
  // onboarding route across all linked projects, so the preview must too or it shows no data.
  it('routes the preview across all linked projects', async () => {
    esqlMock.mockResolvedValue({
      rawResponse: { columns: [{ name: 'service.name', type: 'keyword' }], values: [['checkout']] },
    } as never);

    const { result } = renderPreview();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(esqlMock).toHaveBeenCalledWith(
      expect.objectContaining({ projectRouting: PROJECT_ROUTING.ALL }),
      expect.anything()
    );
  });

  it('returns the sampled rows keyed by column name', async () => {
    esqlMock.mockResolvedValue({
      rawResponse: { columns: [{ name: 'service.name', type: 'keyword' }], values: [['checkout']] },
    } as never);

    const { result } = renderPreview();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({
      columns: ['service.name'],
      rows: [{ 'service.name': 'checkout' }],
    });
  });
});
