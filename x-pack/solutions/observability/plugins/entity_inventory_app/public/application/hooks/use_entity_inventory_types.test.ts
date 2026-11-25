/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { HOST_TYPE_FIXTURE, K8S_DEPLOYMENT_TYPE_FIXTURE } from '../../__fixtures__/inventory_data';
import { useEntityTypes } from '../context/entity_types_context';
import { useEntityInventoryTypes } from './use_entity_inventory_types';

jest.mock('../context/entity_types_context');

const mockUseEntityTypes = useEntityTypes as jest.MockedFunction<typeof useEntityTypes>;

const state = (overrides: Partial<ReturnType<typeof useEntityTypes>> = {}) => ({
  data: [HOST_TYPE_FIXTURE, K8S_DEPLOYMENT_TYPE_FIXTURE],
  loading: false,
  error: undefined,
  refresh: jest.fn(),
  ...overrides,
});

describe('useEntityInventoryTypes', () => {
  it('maps the registered types, with the category of the page they belong to', () => {
    mockUseEntityTypes.mockReturnValue(state());

    const { result } = renderHook(() => useEntityInventoryTypes());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeUndefined();
    expect(result.current.types.map(({ type, category }) => ({ type, category }))).toEqual([
      { type: 'host', category: 'hosts' },
      { type: 'k8s.deployment', category: 'kubernetes' },
    ]);
  });

  it('keeps the suggested filters and the sources of the type', () => {
    mockUseEntityTypes.mockReturnValue(state());

    const { result } = renderHook(() => useEntityInventoryTypes());

    const [host] = result.current.types;
    expect(host.suggestedFilters).toEqual(HOST_TYPE_FIXTURE.suggestedFilters);
    expect(host.sources).toEqual(
      HOST_TYPE_FIXTURE.sources.map(({ indexPattern }) => ({ indexPattern }))
    );
  });

  it('labels an attribute from the column of the same name, only for the suggested filters', () => {
    mockUseEntityTypes.mockReturnValue(state());

    const { result } = renderHook(() => useEntityInventoryTypes());

    const deployment = result.current.types.find(({ type }) => type === 'k8s.deployment');
    expect(deployment?.attributes).toEqual(
      expect.arrayContaining([
        { name: 'kubernetes.namespace', label: 'Namespace' },
        { name: 'k8s.cluster.name', label: 'Cluster' },
      ])
    );
    expect(deployment?.attributes.map(({ name }) => name).sort()).toEqual(
      [...K8S_DEPLOYMENT_TYPE_FIXTURE.suggestedFilters].sort()
    );
  });

  it('reports the loading state and the error of the request', () => {
    const error = new Error('failed');
    mockUseEntityTypes.mockReturnValue(state({ data: [], loading: true, error }));

    const { result } = renderHook(() => useEntityInventoryTypes());

    expect(result.current).toEqual({ types: [], isLoading: true, error });
  });
});
