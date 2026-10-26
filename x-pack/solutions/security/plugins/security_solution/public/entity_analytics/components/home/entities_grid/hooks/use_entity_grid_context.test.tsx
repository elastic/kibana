/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren } from 'react';
import React from 'react';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useSpaceId } from '../../../../../common/hooks/use_space_id';
import { useResolvedLatestEntitiesIndexName } from '../../../../../common/hooks/use_resolved_latest_entities_index_name';
import { getReadyContext, useGridContext } from './use_entity_grid_context';
import type { GridContext } from './use_entity_grid_context';

jest.mock('../../../../../common/lib/kibana', () => ({
  useKibana: () => ({ services: { data: { search: {} }, http: {} } }),
}));
jest.mock('../../../../../common/hooks/use_space_id');
jest.mock('../../../../../common/hooks/use_resolved_latest_entities_index_name');
jest.mock('../../../../../common/components/ml/hooks/use_installed_security_jobs', () => ({
  useInstalledSecurityJobsIds: () => ({ jobIds: [], loading: false }),
}));

const mockResolver = (result: Record<string, unknown>) =>
  jest.mocked(useResolvedLatestEntitiesIndexName).mockReturnValue({
    data: undefined,
    error: null,
    isLoading: false,
    ...result,
  } as unknown as ReturnType<typeof useResolvedLatestEntitiesIndexName>);

const renderContext = () =>
  renderHook(() => useGridContext(), {
    wrapper: ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
    ),
  }).result.current;

describe('useGridContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useSpaceId).mockReturnValue('security');
  });

  it('has the space and the index once they resolve', () => {
    mockResolver({ data: { indexName: 'entities-index' } });

    const context = renderContext();

    expect(context).toMatchObject({
      spaceId: 'security',
      concreteEntityIndexName: 'entities-index',
      isEntitiesIndexLoading: false,
      entitiesIndexError: undefined,
    });
    expect(useResolvedLatestEntitiesIndexName).toHaveBeenCalledWith('security');
  });

  it('has no space, and no index to resolve, until Spaces answers', () => {
    jest.mocked(useSpaceId).mockReturnValue(undefined);
    mockResolver({ isLoading: true });

    const context = renderContext();

    expect(context).toMatchObject({
      spaceId: null,
      concreteEntityIndexName: null,
      isEntitiesIndexLoading: true,
    });
    expect(useResolvedLatestEntitiesIndexName).toHaveBeenCalledWith(undefined);
  });

  it('reports the error of the index resolver', () => {
    const error = new Error('resolver failed');
    mockResolver({ error });

    expect(renderContext().entitiesIndexError).toBe(error);
  });

  it('reports an index that is missing or unreadable, which the resolver returns as a result', () => {
    mockResolver({ data: { indexName: null } });

    const context = renderContext();

    expect(context.concreteEntityIndexName).toBeNull();
    expect(context.entitiesIndexError?.message).toContain('entities index is not available');
  });
});

describe('getReadyContext', () => {
  const context = {
    spaceId: 'default',
    concreteEntityIndexName: 'entities-index',
  } as GridContext;

  it('is the context when the space and the index are known', () => {
    expect(getReadyContext(context)).toMatchObject({
      spaceId: 'default',
      concreteEntityIndexName: 'entities-index',
    });
  });

  it.each([
    ['the space', { ...context, spaceId: null }],
    ['the index', { ...context, concreteEntityIndexName: null }],
  ])('is null without %s', (_name, incomplete) => {
    expect(getReadyContext(incomplete)).toBeNull();
  });
});
