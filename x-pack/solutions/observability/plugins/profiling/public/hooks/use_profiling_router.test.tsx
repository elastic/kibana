/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { ProfilingSchema } from '@kbn/profiling-utils';
import type { ProfilingDependencies } from '../components/contexts/profiling_dependencies/profiling_dependencies_context';
import { ProfilingDependenciesContextProvider } from '../components/contexts/profiling_dependencies/profiling_dependencies_context';
import { IndexLifecyclePhaseSelectOption } from '../../common/storage_explorer';
import { useProfilingRouter } from './use_profiling_router';

// useProfilingRouter only accesses start.core.http.basePath.prepend.
const dependencies = {
  start: { core: { http: { basePath: { prepend: (path: string) => `/base${path}` } } } },
} as unknown as ProfilingDependencies;

const renderProfilingRouter = (initialEntry: string) =>
  renderHook(() => ({ router: useProfilingRouter(), location: useLocation() }), {
    wrapper: ({ children }: React.PropsWithChildren) => (
      <MemoryRouter initialEntries={[initialEntry]}>
        <ProfilingDependenciesContextProvider value={dependencies}>
          {children}
        </ProfilingDependenciesContextProvider>
      </MemoryRouter>
    ),
  });

describe('useProfilingRouter', () => {
  describe('link', () => {
    it('keeps the schema of the current URL', () => {
      const { result } = renderProfilingRouter('/flamegraphs/flamegraph?schema=ecs');

      expect(result.current.router.link('/settings')).toBe(
        '/base/app/profiling/settings?schema=ecs'
      );
    });

    it('keeps the schema alongside the target query', () => {
      const { result } = renderProfilingRouter('/flamegraphs/flamegraph?schema=ecs');

      expect(
        result.current.router.link('/storage-explorer', {
          query: {
            rangeFrom: 'now-15m',
            rangeTo: 'now',
            kuery: '',
            indexLifecyclePhase: IndexLifecyclePhaseSelectOption.All,
          },
        })
      ).toBe(
        '/base/app/profiling/storage-explorer?indexLifecyclePhase=all&kuery=&rangeFrom=now-15m&rangeTo=now&schema=ecs'
      );
    });

    it('uses the schema selected by the target query', () => {
      const { result } = renderProfilingRouter('/flamegraphs/flamegraph?schema=ecs');

      expect(
        result.current.router.link('/settings', { query: { schema: ProfilingSchema.OTEL } })
      ).toBe('/base/app/profiling/settings?schema=otel');
    });

    it('does not drop the schema when the target query unsets it', () => {
      const { result } = renderProfilingRouter('/flamegraphs/flamegraph?schema=ecs');

      expect(result.current.router.link('/settings', { query: { schema: undefined } })).toBe(
        '/base/app/profiling/settings?schema=ecs'
      );
    });

    it('does not add a schema when the current URL has none', () => {
      const { result } = renderProfilingRouter('/flamegraphs/flamegraph');

      expect(result.current.router.link('/settings')).toBe('/base/app/profiling/settings');
    });

    it('does not keep an unknown schema', () => {
      const { result } = renderProfilingRouter('/flamegraphs/flamegraph?schema=semconv');

      expect(result.current.router.link('/settings')).toBe('/base/app/profiling/settings');
    });
  });

  describe.each(['push', 'replace'] as const)('%s', (method) => {
    it('keeps the schema of the current URL', () => {
      const { result } = renderProfilingRouter('/flamegraphs/flamegraph?schema=otel');

      act(() => result.current.router[method]('/settings', { path: {}, query: {} }));

      expect(result.current.location).toEqual(
        expect.objectContaining({ pathname: '/settings', search: '?schema=otel' })
      );
    });

    it('uses the schema selected by the target query', () => {
      const { result } = renderProfilingRouter('/flamegraphs/flamegraph?schema=otel');

      act(() =>
        result.current.router[method]('/settings', {
          path: {},
          query: { schema: ProfilingSchema.ECS },
        })
      );

      expect(result.current.location.search).toBe('?schema=ecs');
    });
  });
});
