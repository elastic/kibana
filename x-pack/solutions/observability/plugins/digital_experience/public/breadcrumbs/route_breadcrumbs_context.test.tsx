/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import * as t from 'io-ts';
import {
  Outlet,
  RouteRenderer,
  RouterProvider,
  createRouter,
} from '@kbn/typed-react-router-config';
import { useBreadcrumbs } from '@kbn/observability-shared-plugin/public';
import { RouteBreadcrumbsContextProvider } from './route_breadcrumbs_context';
import { useRouteBreadcrumb } from './use_route_breadcrumb';

jest.mock('@kbn/observability-shared-plugin/public');

function Layout() {
  useRouteBreadcrumb([{ text: 'Section' }, { text: 'List', href: '/list-href' }]);
  return <Outlet />;
}

function Detail() {
  useRouteBreadcrumb([{ text: 'my-item' }, { text: 'Tab' }]);
  return null;
}

const router = createRouter({
  '/': {
    element: <Layout />,
    children: {
      '/{id}': { element: <Detail />, params: t.type({ path: t.type({ id: t.string }) }) },
      '/': { element: <></> },
    },
  },
});

const renderAt = (pathname: string) =>
  render(
    <RouterProvider
      history={createMemoryHistory({ initialEntries: [pathname] })}
      router={router as unknown as React.ComponentProps<typeof RouterProvider>['router']}
    >
      <RouteBreadcrumbsContextProvider>
        <RouteRenderer />
      </RouteBreadcrumbsContextProvider>
    </RouterProvider>
  );

describe('RouteBreadcrumbsContextProvider', () => {
  beforeEach(() => jest.mocked(useBreadcrumbs).mockClear());

  it('uses the outer route breadcrumbs on the list, with the current page unlinked', () => {
    renderAt('/');

    expect(useBreadcrumbs).toHaveBeenLastCalledWith([{ text: 'Section' }, { text: 'List' }]);
  });

  it('joins the breadcrumbs of every matched route, outermost first', () => {
    renderAt('/my-item');

    expect(useBreadcrumbs).toHaveBeenLastCalledWith([
      { text: 'Section' },
      { text: 'List', href: '/list-href' },
      { text: 'my-item' },
      { text: 'Tab' },
    ]);
  });
});
