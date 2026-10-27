/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { ProfilingSchema } from '@kbn/profiling-utils';
import { useSelectDefaultSchema } from './use_select_default_schema';

const ALL_SCHEMAS = Object.values(ProfilingSchema);

describe('useSelectDefaultSchema', () => {
  const onSelectDefaultSchema = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('selects the default schema once the schemas with data are known', () => {
    renderHook(() =>
      useSelectDefaultSchema({
        schemas: [ProfilingSchema.ECS],
        supportedSchemas: ALL_SCHEMAS,
        isLoading: false,
        hasSelectedSchema: false,
        onSelectDefaultSchema,
      })
    );

    expect(onSelectDefaultSchema).toHaveBeenCalledWith(ProfilingSchema.ECS);
  });

  it('selects the default schema when the schemas with data cannot be fetched', () => {
    renderHook(() =>
      useSelectDefaultSchema({
        schemas: undefined,
        supportedSchemas: ALL_SCHEMAS,
        isLoading: false,
        hasSelectedSchema: false,
        onSelectDefaultSchema,
      })
    );

    expect(onSelectDefaultSchema).toHaveBeenCalledWith(ProfilingSchema.OTEL);
  });

  it('waits while the schemas are loading', () => {
    renderHook(() =>
      useSelectDefaultSchema({
        schemas: [ProfilingSchema.ECS],
        supportedSchemas: ALL_SCHEMAS,
        isLoading: true,
        hasSelectedSchema: false,
        onSelectDefaultSchema,
      })
    );

    expect(onSelectDefaultSchema).not.toHaveBeenCalled();
  });

  it('keeps a selected schema', () => {
    renderHook(() =>
      useSelectDefaultSchema({
        schemas: [ProfilingSchema.ECS],
        supportedSchemas: ALL_SCHEMAS,
        isLoading: false,
        hasSelectedSchema: true,
        onSelectDefaultSchema,
      })
    );

    expect(onSelectDefaultSchema).not.toHaveBeenCalled();
  });
});
