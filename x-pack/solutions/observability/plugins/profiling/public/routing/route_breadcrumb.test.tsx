/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ProfilingDependencies } from '../components/contexts/profiling_dependencies/profiling_dependencies_context';
import { ProfilingDependenciesContextProvider } from '../components/contexts/profiling_dependencies/profiling_dependencies_context';
import { useRouteBreadcrumb } from '../components/contexts/route_breadcrumbs_context/use_route_breadcrumb';
import { RouteBreadcrumb } from './route_breadcrumb';

jest.mock('../components/contexts/route_breadcrumbs_context/use_route_breadcrumb', () => ({
  useRouteBreadcrumb: jest.fn(),
}));

const mockedUseRouteBreadcrumb = jest.mocked(useRouteBreadcrumb);

// RouteBreadcrumb only accesses start.core.http.basePath.prepend.
const dependencies = {
  start: { core: { http: { basePath: { prepend: (path: string) => `/base${path}` } } } },
} as unknown as ProfilingDependencies;

const renderBreadcrumb = ({ initialEntry, href }: { initialEntry: string; href: string }) =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <ProfilingDependenciesContextProvider value={dependencies}>
        <RouteBreadcrumb title="Settings" href={href}>
          <div />
        </RouteBreadcrumb>
      </ProfilingDependenciesContextProvider>
    </MemoryRouter>
  );

describe('RouteBreadcrumb', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('keeps the schema of the current URL', () => {
    renderBreadcrumb({ initialEntry: '/settings?schema=ecs', href: '/settings' });

    expect(mockedUseRouteBreadcrumb).toHaveBeenCalledWith({
      title: 'Settings',
      href: '/base/app/profiling/settings?schema=ecs',
    });
  });

  it('keeps the query of the href', () => {
    renderBreadcrumb({
      initialEntry: '/stacktraces/hosts?schema=otel',
      href: '/stacktraces/hosts?limit=10',
    });

    expect(mockedUseRouteBreadcrumb).toHaveBeenCalledWith({
      title: 'Settings',
      href: '/base/app/profiling/stacktraces/hosts?limit=10&schema=otel',
    });
  });

  it('does not add a schema when the current URL has none', () => {
    renderBreadcrumb({ initialEntry: '/settings', href: '/settings' });

    expect(mockedUseRouteBreadcrumb).toHaveBeenCalledWith({
      title: 'Settings',
      href: '/base/app/profiling/settings',
    });
  });
});
