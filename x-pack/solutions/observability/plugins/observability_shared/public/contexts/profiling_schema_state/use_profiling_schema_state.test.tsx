/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, renderHook, screen } from '@testing-library/react';
import { ProfilingSchema } from '@kbn/profiling-utils';
import { ProfilingSchemaStateProvider } from './profiling_schema_state_context';
import { useProfilingSchemaState } from './use_profiling_schema_state';

describe('useProfilingSchemaState', () => {
  it('starts without a schema so a default can be picked', () => {
    const { result } = renderHook(() => useProfilingSchemaState(), {
      wrapper: ProfilingSchemaStateProvider,
    });

    expect(result.current.schema).toBeUndefined();
  });

  it('shares the selected schema among the components below the provider', () => {
    let selectSchema: (schema: ProfilingSchema) => void = () => {};
    const Selector = () => {
      selectSchema = useProfilingSchemaState().setSchema;
      return null;
    };
    const SchemaDisplay = () => <span>{useProfilingSchemaState().schema}</span>;

    render(
      <ProfilingSchemaStateProvider>
        <Selector />
        <SchemaDisplay />
      </ProfilingSchemaStateProvider>
    );
    act(() => selectSchema(ProfilingSchema.OTEL));

    expect(screen.getByText(ProfilingSchema.OTEL)).toBeInTheDocument();
  });

  it('throws when used outside of a provider', () => {
    // React logs the error thrown while rendering
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => renderHook(() => useProfilingSchemaState())).toThrow(
      'useProfilingSchemaState must be used within a ProfilingSchemaStateProvider'
    );

    consoleErrorSpy.mockRestore();
  });
});
