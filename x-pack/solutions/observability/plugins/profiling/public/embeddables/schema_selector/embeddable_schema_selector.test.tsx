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
  const renderSchemaSelector = ({
    schema,
    schemas,
    isLoadingSchemas = false,
    schemasError,
  }: {
    schema?: ProfilingSchema;
    schemas?: ProfilingSchema[];
    isLoadingSchemas?: boolean;
    schemasError?: Error;
  }) => {
    const onSchemaChange = jest.fn();

    render(
      <EmbeddableSchemaSelector
        {...({} as ProfilingEmbeddablesDependencies)}
        schema={schema}
        onSchemaChange={onSchemaChange}
        schemas={schemas}
        isLoadingSchemas={isLoadingSchemas}
        schemasError={schemasError}
      />
    );

    return { onSchemaChange };
  };

  const getSelectorProps = () => jest.mocked(SchemaSelector).mock.lastCall?.[0];

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchProfilingStatus.mockResolvedValue(createProfilingStatus());
  });

  it('offers the schemas with data given by its consumer', async () => {
    renderSchemaSelector({ schema: ProfilingSchema.OTEL, schemas: [ProfilingSchema.OTEL] });

    await waitFor(() => expect(getSelectorProps()?.isLoading).toBe(false));
    expect(getSelectorProps()).toEqual(
      expect.objectContaining({
        selectedSchema: ProfilingSchema.OTEL,
        schemas: [ProfilingSchema.OTEL],
        supportedSchemas: [ProfilingSchema.ECS, ProfilingSchema.OTEL],
      })
    );
    expect(mockFetchAvailableSchemas).not.toHaveBeenCalled();
  });

  it.each([
    [[ProfilingSchema.ECS, ProfilingSchema.OTEL], ProfilingSchema.OTEL],
    [[ProfilingSchema.ECS], ProfilingSchema.ECS],
    [[ProfilingSchema.OTEL], ProfilingSchema.OTEL],
  ])('selects the default schema when %j have data', async (schemas, expectedSchema) => {
    const { onSchemaChange } = renderSchemaSelector({ schemas });

    await waitFor(() => expect(onSchemaChange).toHaveBeenCalledWith(expectedSchema));
  });

  it('selects Universal Profiling on a cluster with only its data when no schema has data for the view', async () => {
    mockFetchProfilingStatus.mockResolvedValue(createProfilingStatus({ hasOtelData: false }));

    const { onSchemaChange } = renderSchemaSelector({ schemas: [] });

    await waitFor(() => expect(onSchemaChange).toHaveBeenCalledWith(ProfilingSchema.ECS));
  });

  it('selects the default schema when the schemas with data cannot be fetched', async () => {
    const schemasError = new Error('Request failed');

    const { onSchemaChange } = renderSchemaSelector({ schemasError });

    await waitFor(() => expect(onSchemaChange).toHaveBeenCalledWith(ProfilingSchema.OTEL));
    expect(getSelectorProps()?.error).toBe(schemasError);
  });

  it('keeps the given schema', async () => {
    const { onSchemaChange } = renderSchemaSelector({
      schema: ProfilingSchema.ECS,
      schemas: [ProfilingSchema.OTEL],
    });

    await waitFor(() => expect(getSelectorProps()?.isLoading).toBe(false));
    expect(onSchemaChange).not.toHaveBeenCalled();
    expect(getSelectorProps()?.selectedSchema).toBe(ProfilingSchema.ECS);
  });

  it('waits for the schemas with data before selecting a default schema', async () => {
    const { onSchemaChange } = renderSchemaSelector({ isLoadingSchemas: true });

    await waitFor(() => expect(mockFetchProfilingStatus).toHaveBeenCalled());
    expect(getSelectorProps()?.isLoading).toBe(true);
    expect(onSchemaChange).not.toHaveBeenCalled();
  });

  it('waits for the profiling status before selecting a default schema', async () => {
    mockFetchProfilingStatus.mockReturnValue(new Promise(() => {}));

    const { onSchemaChange } = renderSchemaSelector({
      schemas: [ProfilingSchema.ECS, ProfilingSchema.OTEL],
    });

    await waitFor(() => expect(mockFetchProfilingStatus).toHaveBeenCalled());
    expect(getSelectorProps()?.isLoading).toBe(true);
    expect(onSchemaChange).not.toHaveBeenCalled();
  });
});
