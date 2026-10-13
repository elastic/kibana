/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import type { ProfilingSchemasStatus } from '@kbn/profiling-utils';
import { ProfilingSchema } from '@kbn/profiling-utils';
import { SchemaSelector } from '../../components/schema_selector';
import type { ProfilingEmbeddablesDependencies } from '../profiling_embeddable_provider';
import { EmbeddableSchemaSelector } from './embeddable_schema_selector';

const mockFetchProfilingStatus = jest.fn();
const mockFetchAvailableSchemas = jest.fn();
// Stable across renders, like the actual dependencies, so requests only rerun when their inputs change
const mockDependencies = {
  start: { core: { http: {}, notifications: { toasts: { addError: jest.fn() } } } },
  services: {
    fetchProfilingStatus: mockFetchProfilingStatus,
    fetchAvailableSchemas: mockFetchAvailableSchemas,
  },
};

jest.mock('../../components/contexts/profiling_dependencies/use_profiling_dependencies', () => ({
  useProfilingDependencies: () => mockDependencies,
}));
jest.mock('../profiling_embeddable_provider', () => ({
  ProfilingEmbeddableProvider: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('../../components/schema_selector', () => ({ SchemaSelector: jest.fn(() => null) }));

const createProfilingStatus = ({
  hasOtelData = true,
}: { hasOtelData?: boolean } = {}): ProfilingSchemasStatus => ({
  isEnabled: true,
  otel: { isAvailable: true, hasData: hasOtelData },
  universalProfiling: { isAvailable: true, hasSetup: true, hasData: true, hasLegacyData: false },
});

describe('EmbeddableSchemaSelector', () => {
  const rangeFrom = new Date('2023-04-18T00:00:00.000Z').getTime();
  const rangeTo = new Date('2023-04-18T00:15:00.000Z').getTime();

  const renderSchemaSelector = (schema?: ProfilingSchema) => {
    const onSchemaChange = jest.fn();

    render(
      <EmbeddableSchemaSelector
        {...({} as ProfilingEmbeddablesDependencies)}
        rangeFrom={rangeFrom}
        rangeTo={rangeTo}
        kuery='host.name : "host-1"'
        schema={schema}
        onSchemaChange={onSchemaChange}
      />
    );

    return { onSchemaChange };
  };

  const getSelectorProps = () => jest.mocked(SchemaSelector).mock.lastCall?.[0];

  const mockSchemasWithData = (schemas: ProfilingSchema[]) =>
    mockFetchAvailableSchemas.mockResolvedValue({ schemas });

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchProfilingStatus.mockResolvedValue(createProfilingStatus());
  });

  it('checks which schemas have data for the time range and query', async () => {
    mockSchemasWithData([ProfilingSchema.OTEL]);

    renderSchemaSelector(ProfilingSchema.OTEL);

    await waitFor(() => expect(getSelectorProps()?.isLoading).toBe(false));
    expect(mockFetchAvailableSchemas).toHaveBeenCalledWith({
      http: expect.any(Object),
      timeFrom: rangeFrom,
      timeTo: rangeTo,
      kuery: 'host.name : "host-1"',
    });
    expect(getSelectorProps()).toEqual(
      expect.objectContaining({
        selectedSchema: ProfilingSchema.OTEL,
        schemas: [ProfilingSchema.OTEL],
        supportedSchemas: [ProfilingSchema.ECS, ProfilingSchema.OTEL],
      })
    );
  });

  it.each([
    [[ProfilingSchema.ECS, ProfilingSchema.OTEL], ProfilingSchema.OTEL],
    [[ProfilingSchema.ECS], ProfilingSchema.ECS],
    [[ProfilingSchema.OTEL], ProfilingSchema.OTEL],
  ])('selects the default schema when %j have data', async (schemasWithData, expectedSchema) => {
    mockSchemasWithData(schemasWithData);

    const { onSchemaChange } = renderSchemaSelector();

    await waitFor(() => expect(onSchemaChange).toHaveBeenCalledWith(expectedSchema));
  });

  it('selects Universal Profiling on a cluster with only its data when no schema has data in the time range', async () => {
    mockFetchProfilingStatus.mockResolvedValue(createProfilingStatus({ hasOtelData: false }));
    mockSchemasWithData([]);

    const { onSchemaChange } = renderSchemaSelector();

    await waitFor(() => expect(onSchemaChange).toHaveBeenCalledWith(ProfilingSchema.ECS));
  });

  it('keeps the given schema', async () => {
    mockSchemasWithData([ProfilingSchema.OTEL]);

    const { onSchemaChange } = renderSchemaSelector(ProfilingSchema.ECS);

    await waitFor(() => expect(getSelectorProps()?.isLoading).toBe(false));
    expect(onSchemaChange).not.toHaveBeenCalled();
    expect(getSelectorProps()?.selectedSchema).toBe(ProfilingSchema.ECS);
  });

  it('waits for the profiling status before selecting a default schema', async () => {
    mockFetchProfilingStatus.mockReturnValue(new Promise(() => {}));
    mockSchemasWithData([ProfilingSchema.ECS, ProfilingSchema.OTEL]);

    const { onSchemaChange } = renderSchemaSelector();

    await waitFor(() => expect(mockFetchAvailableSchemas).toHaveBeenCalled());
    expect(getSelectorProps()?.isLoading).toBe(true);
    expect(onSchemaChange).not.toHaveBeenCalled();
  });
});
