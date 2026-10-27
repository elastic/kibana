/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import { coreMock } from '@kbn/core/public/mocks';
import { Router } from '@kbn/shared-ux-router';
import { createCoreStartMock, createStartDependenciesMock } from '../mocks';
import { ENTITY_LIST_PLACEHOLDER, ENTITY_PAGE_TITLES } from './translations';
import { EntityInventoryApp, renderApp } from '.';

const renderAtPath = (path: string) => {
  const history = createMemoryHistory({ initialEntries: [path] });
  render(
    <MockAppHeaderProvider>
      <Router history={history}>
        <EntityInventoryApp core={createCoreStartMock()} plugins={createStartDependenciesMock()} />
      </Router>
    </MockAppHeaderProvider>
  );
  return history;
};

describe('EntityInventoryApp', () => {
  it('renders the page shell and title for the entity type of the current route', () => {
    renderAtPath('/hosts');

    expect(screen.getByTestId('entityInventoryPageShell')).toHaveAttribute(
      'data-entity-type',
      'hosts'
    );
    expect(screen.getByRole('heading', { name: ENTITY_PAGE_TITLES.hosts })).toBeInTheDocument();
    expect(screen.getByTestId('mockSearchBar')).toBeInTheDocument();
    expect(screen.getByTestId('entityInventoryPlaceholder')).toHaveTextContent(
      ENTITY_LIST_PLACEHOLDER
    );
  });

  it('redirects the root path to all resources', () => {
    const history = renderAtPath('/');

    expect(history.location.pathname).toBe('/all-resources');
    expect(screen.getByTestId('entityInventoryPageShell')).toHaveAttribute(
      'data-entity-type',
      'all'
    );
  });
});

describe('renderApp', () => {
  it('mounts the routed app within the core rendering context and unmounts it', () => {
    const core = createCoreStartMock();
    const params = coreMock.createAppMountParameters('/app/entity-inventory');
    params.history.push('/kubernetes');

    let unmount: () => void = () => {};
    act(() => {
      unmount = renderApp(core, createStartDependenciesMock(), params);
    });

    expect(core.rendering.addContext).toHaveBeenCalledTimes(1);
    expect(
      params.element.querySelector('[data-test-subj="entityInventoryPageShell"]')
    ).toHaveAttribute('data-entity-type', 'kubernetes');

    act(() => unmount());

    expect(params.element.childElementCount).toBe(0);
  });
});
