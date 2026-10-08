/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { MemoryRouter, useHistory, useLocation } from 'react-router-dom';
import type { ProfilingStatus } from '@kbn/profiling-utils';
import { ProfilingSchema } from '@kbn/profiling-utils';
import { AsyncStatus } from '../../../hooks/use_async';
import { useTimeRangeAsync } from '../../../hooks/use_time_range_async';
import type { ProfilingDependencies } from '../profiling_dependencies/profiling_dependencies_context';
import { ProfilingDependenciesContextProvider } from '../profiling_dependencies/profiling_dependencies_context';
import { ProfilingStatusContext } from '../profiling_status/profiling_status_context';
import { TimeRangeContextProvider } from '../time_range_context';
import { ProfilingSchemaContextProvider } from './profiling_schema_context';
import { useProfilingSchema } from './use_profiling_schema';

// The real hook is used by default. A failed fetch is mocked instead of rejected, since `useAsync`
// rethrows rejections, which Jest reports as unhandled.
jest.mock('../../../hooks/use_time_range_async', () => {
  const actual = jest.requireActual('../../../hooks/use_time_range_async');
  return { useTimeRangeAsync: jest.fn(actual.useTimeRangeAsync) };
});

const mockedUseTimeRangeAsync = jest.mocked(useTimeRangeAsync);
const { useTimeRangeAsync: actualUseTimeRangeAsync } = jest.requireActual(
  '../../../hooks/use_time_range_async'
);

describe('ProfilingSchemaContextProvider', () => {
  const fetchAvailableSchemas = jest.fn();

  const dependencies = {
    start: {
      core: {
        http: { get: jest.fn() },
        notifications: { toasts: { addWarning: jest.fn() } },
      },
    },
    services: { fetchAvailableSchemas },
  } as unknown as ProfilingDependencies;

  const createProfilingStatus = ({
    isUniversalProfilingAvailable = true,
    hasOtelData = true,
  }: { isUniversalProfilingAvailable?: boolean; hasOtelData?: boolean } = {}): ProfilingStatus => ({
    isEnabled: true,
    otel: { isAvailable: true, hasData: hasOtelData },
    universalProfiling: {
      isAvailable: isUniversalProfilingAvailable,
      hasSetup: isUniversalProfilingAvailable,
      hasData: isUniversalProfilingAvailable,
      hasLegacyData: false,
      canSetup: isUniversalProfilingAvailable,
    },
  });

  const renderProfilingSchema = ({
    initialEntry = '/flamegraphs/flamegraph?kuery=',
    kuery = '',
    profilingStatus = createProfilingStatus(),
  }: { initialEntry?: string; kuery?: string; profilingStatus?: ProfilingStatus } = {}) =>
    renderHook(
      () => ({ ...useProfilingSchema(), location: useLocation(), history: useHistory() }),
      {
        wrapper: ({ children }: React.PropsWithChildren) => (
          <MemoryRouter initialEntries={[initialEntry]}>
            <TimeRangeContextProvider>
              <ProfilingDependenciesContextProvider value={dependencies}>
                <ProfilingStatusContext.Provider
                  value={{
                    status: AsyncStatus.Settled,
                    data: profilingStatus,
                    refresh: jest.fn(),
                  }}
                >
                  <ProfilingSchemaContextProvider
                    rangeFrom="2023-04-18T00:00:00.000Z"
                    rangeTo="2023-04-18T00:15:00.000Z"
                    kuery={kuery}
                  >
                    {children}
                  </ProfilingSchemaContextProvider>
                </ProfilingStatusContext.Provider>
              </ProfilingDependenciesContextProvider>
            </TimeRangeContextProvider>
          </MemoryRouter>
        ),
      }
    );

  const mockSchemasWithData = (schemas: ProfilingSchema[]) =>
    fetchAvailableSchemas.mockResolvedValue({ schemas });

  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseTimeRangeAsync.mockImplementation(actualUseTimeRangeAsync);
  });

  it('fetches the schemas with data for the time range and query', async () => {
    mockSchemasWithData([ProfilingSchema.ECS]);

    const { result } = renderProfilingSchema({ kuery: 'host.name:my-host' });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(fetchAvailableSchemas).toHaveBeenCalledWith({
      http: expect.any(Object),
      timeFrom: new Date('2023-04-18T00:00:00.000Z').getTime(),
      timeTo: new Date('2023-04-18T00:15:00.000Z').getTime(),
      kuery: 'host.name:my-host',
    });
    expect(result.current.schemas).toEqual([ProfilingSchema.ECS]);
    expect(result.current.error).toBeUndefined();
  });

  it('supports both schemas when Universal Profiling is available', () => {
    fetchAvailableSchemas.mockReturnValue(new Promise(() => {}));

    const { result } = renderProfilingSchema();

    expect(result.current.supportedSchemas).toEqual([ProfilingSchema.ECS, ProfilingSchema.OTEL]);
  });

  it('only supports OTel when Universal Profiling is not available', () => {
    fetchAvailableSchemas.mockReturnValue(new Promise(() => {}));

    const { result } = renderProfilingSchema({
      profilingStatus: createProfilingStatus({ isUniversalProfilingAvailable: false }),
    });

    expect(result.current.supportedSchemas).toEqual([ProfilingSchema.OTEL]);
  });

  describe('when the URL has no schema', () => {
    it.each([
      [[ProfilingSchema.ECS, ProfilingSchema.OTEL], ProfilingSchema.OTEL],
      [[ProfilingSchema.ECS], ProfilingSchema.ECS],
      [[ProfilingSchema.OTEL], ProfilingSchema.OTEL],
      [[], ProfilingSchema.OTEL],
    ])(
      'selects the default schema in place when %j have data',
      async (schemasWithData, expectedSchema) => {
        mockSchemasWithData(schemasWithData);

        const { result } = renderProfilingSchema();

        await waitFor(() => expect(result.current.selectedSchema).toBe(expectedSchema));
        expect(result.current.history.action).toBe('REPLACE');
        expect(result.current.location.search).toBe(`?kuery=&schema=${expectedSchema}`);
      }
    );

    it('selects the default schema when the schemas with data cannot be fetched', async () => {
      mockedUseTimeRangeAsync.mockReturnValue({
        status: AsyncStatus.Settled,
        error: new Error('Request failed'),
        refresh: jest.fn(),
      });

      const { result } = renderProfilingSchema();

      await waitFor(() => expect(result.current.selectedSchema).toBe(ProfilingSchema.OTEL));
      expect(result.current.schemas).toBeUndefined();
      expect(result.current.error).toEqual(new Error('Request failed'));
    });

    describe('on a cluster with only Universal Profiling data', () => {
      const profilingStatus = createProfilingStatus({ hasOtelData: false });

      it('selects Universal Profiling when no schema has data', async () => {
        mockSchemasWithData([]);

        const { result } = renderProfilingSchema({ profilingStatus });

        await waitFor(() => expect(result.current.selectedSchema).toBe(ProfilingSchema.ECS));
      });

      it('selects Universal Profiling when the schemas with data cannot be fetched', async () => {
        mockedUseTimeRangeAsync.mockReturnValue({
          status: AsyncStatus.Settled,
          error: new Error('Request failed'),
          refresh: jest.fn(),
        });

        const { result } = renderProfilingSchema({ profilingStatus });

        await waitFor(() => expect(result.current.selectedSchema).toBe(ProfilingSchema.ECS));
      });
    });

    it('does not select a schema while the schemas with data are loading', () => {
      fetchAvailableSchemas.mockReturnValue(new Promise(() => {}));

      const { result } = renderProfilingSchema();

      expect(result.current.isLoading).toBe(true);
      expect(result.current.selectedSchema).toBeUndefined();
      expect(result.current.location.search).toBe('?kuery=');
    });
  });

  describe('when the URL has a schema', () => {
    it.each([
      ['has data', [ProfilingSchema.ECS, ProfilingSchema.OTEL]],
      ['has no data but the other schema has', [ProfilingSchema.OTEL]],
      ['has no data, like the other schema', []],
    ])('keeps it when it %s', async (_description, schemasWithData) => {
      mockSchemasWithData(schemasWithData);

      const { result } = renderProfilingSchema({
        initialEntry: '/flamegraphs/flamegraph?kuery=&schema=ecs',
      });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.selectedSchema).toBe(ProfilingSchema.ECS);
      expect(result.current.location.search).toBe('?kuery=&schema=ecs');
    });
  });

  it('adds the selected schema to the browser history', async () => {
    mockSchemasWithData([ProfilingSchema.ECS, ProfilingSchema.OTEL]);

    const { result } = renderProfilingSchema({
      initialEntry: '/flamegraphs/flamegraph?kuery=&schema=otel',
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.onSchemaChange(ProfilingSchema.ECS));

    expect(result.current.selectedSchema).toBe(ProfilingSchema.ECS);
    expect(result.current.history.action).toBe('PUSH');
    expect(result.current.location).toEqual(
      expect.objectContaining({ pathname: '/flamegraphs/flamegraph', search: '?kuery=&schema=ecs' })
    );
  });
});
