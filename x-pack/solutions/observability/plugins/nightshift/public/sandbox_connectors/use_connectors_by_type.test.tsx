/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { useConnectorsByType } from './use_connectors_by_type';
import {
  actionType,
  createHookWrapper,
  httpError,
  mockKibanaServices,
  sandboxConnector,
} from './test_utils';

jest.mock('../hooks/use_kibana', () => ({ useKibana: jest.fn() }));

describe('useConnectorsByType', () => {
  it('groups the space connectors by type and counts the ones the agent has', async () => {
    mockKibanaServices({
      types: [actionType('.http'), actionType('.github')],
      connectors: [
        sandboxConnector('h1'),
        sandboxConnector('h2'),
        sandboxConnector('g1', { connector_type_id: '.github' }),
      ],
      assigned: ['h1', 'g1'],
    });

    const { result } = renderHook(() => useConnectorsByType(), { wrapper: createHookWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.groups).toEqual([
      expect.objectContaining({
        actionType: expect.objectContaining({ id: '.http' }),
        connectors: [expect.objectContaining({ id: 'h1' }), expect.objectContaining({ id: 'h2' })],
        assignedCount: 1,
      }),
      expect.objectContaining({
        actionType: expect.objectContaining({ id: '.github' }),
        connectors: [expect.objectContaining({ id: 'g1' })],
        assignedCount: 1,
      }),
    ]);
    expect(result.current.telemetryConnectors).toEqual([]);
  });

  it('sets the telemetry connectors apart from the type groups', async () => {
    mockKibanaServices({
      types: [actionType('.http')],
      connectors: [
        sandboxConnector('telemetry', { is_preconfigured: true }),
        sandboxConnector('h1'),
      ],
      assigned: ['telemetry', 'h1'],
      telemetryConnectorIds: ['telemetry', 'unreadable'],
    });

    const { result } = renderHook(() => useConnectorsByType(), { wrapper: createHookWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.telemetryConnectors).toEqual([
      expect.objectContaining({ id: 'telemetry' }),
    ]);
    expect(result.current.groups).toEqual([
      expect.objectContaining({
        connectors: [expect.objectContaining({ id: 'h1' })],
        assignedCount: 1,
      }),
    ]);
  });

  it('keeps a type with no connectors in the space', async () => {
    mockKibanaServices({ types: [actionType('.http')] });

    const { result } = renderHook(() => useConnectorsByType(), { wrapper: createHookWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.groups).toEqual([
      expect.objectContaining({ connectors: [], assignedCount: 0 }),
    ]);
  });

  it('reports a failed types request as such and retries only it', async () => {
    const { fetchConnectorTypes, fetchConnectors } = mockKibanaServices({
      types: [actionType('.http')],
    });
    fetchConnectorTypes.mockRejectedValueOnce(httpError(403));

    const { result } = renderHook(() => useConnectorsByType(), { wrapper: createHookWrapper() });

    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.typesError).not.toBeNull();
    const connectorCalls = fetchConnectors.mock.calls.length;

    act(() => result.current.refetch());

    await waitFor(() => expect(result.current.error).toBeNull());
    expect(fetchConnectorTypes).toHaveBeenCalledTimes(2);
    expect(fetchConnectors).toHaveBeenCalledTimes(connectorCalls);
    expect(result.current.groups).toHaveLength(1);
  });

  it('reports a failed connectors request without blaming the types', async () => {
    const { fetchConnectors } = mockKibanaServices({ types: [actionType('.http')] });
    fetchConnectors.mockRejectedValueOnce(httpError(403));

    const { result } = renderHook(() => useConnectorsByType(), { wrapper: createHookWrapper() });

    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.typesError).toBeNull();
  });
});
