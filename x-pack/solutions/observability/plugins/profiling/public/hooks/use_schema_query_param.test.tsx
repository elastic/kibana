/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProfilingSchema } from '@kbn/profiling-utils';
import { useSchemaQueryParam } from './use_schema_query_param';

const renderSchemaQueryParam = (initialEntry: string) =>
  renderHook(() => useSchemaQueryParam(), {
    wrapper: ({ children }: React.PropsWithChildren) => (
      <MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter>
    ),
  });

describe('useSchemaQueryParam', () => {
  it.each(Object.values(ProfilingSchema))('returns the %s schema from the URL', (schema) => {
    const { result } = renderSchemaQueryParam(`/settings?kuery=&schema=${schema}`);

    expect(result.current).toBe(schema);
  });

  it('returns undefined when the URL has no schema', () => {
    const { result } = renderSchemaQueryParam('/settings?kuery=');

    expect(result.current).toBeUndefined();
  });

  it('returns undefined when the URL has an unknown schema', () => {
    const { result } = renderSchemaQueryParam('/settings?schema=semconv');

    expect(result.current).toBeUndefined();
  });
});
