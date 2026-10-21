/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { coreMock } from '@kbn/core/public/mocks';
import { unifiedSearchPluginMock } from '@kbn/unified-search-plugin/public/mocks';
import { ENTITY_LIST_PLACEHOLDER } from './translations';
import { EntityInventoryApp, renderApp } from '.';

const createDeps = () => {
  const unifiedSearch = unifiedSearchPluginMock.createStartContract();
  unifiedSearch.ui.SearchBar = () => <div data-test-subj="mockSearchBar" />;
  return { core: coreMock.createStart(), plugins: { unifiedSearch } };
};

describe('EntityInventoryApp', () => {
  it('renders the page shell for all resources by default with the plugin services', () => {
    render(<EntityInventoryApp {...createDeps()} />);

    expect(screen.getByTestId('entityInventoryPageShell')).toHaveAttribute(
      'data-entity-type',
      'all'
    );
    expect(screen.getByTestId('mockSearchBar')).toBeInTheDocument();
    expect(screen.getByTestId('entityInventoryPlaceholder')).toHaveTextContent(
      ENTITY_LIST_PLACEHOLDER
    );
  });

  it('renders the page shell for the requested entity type', () => {
    render(<EntityInventoryApp {...createDeps()} entityType="kubernetes" />);

    expect(screen.getByTestId('entityInventoryPageShell')).toHaveAttribute(
      'data-entity-type',
      'kubernetes'
    );
  });
});

describe('renderApp', () => {
  it('mounts the app within the core rendering context and unmounts it', async () => {
    const element = document.createElement('div');
    const { plugins } = createDeps();
    const { getStartServices } = coreMock.createSetup({ pluginStartDeps: plugins });
    const [core] = await getStartServices();
    getStartServices.mockResolvedValue([core, plugins, {}]);

    let unmount: () => void = () => {};
    await act(async () => {
      unmount = await renderApp(element, getStartServices);
    });

    expect(core.rendering.addContext).toHaveBeenCalledTimes(1);
    expect(element.querySelector('[data-test-subj="entityInventoryPageShell"]')).not.toBeNull();

    act(() => unmount());

    expect(element.childElementCount).toBe(0);
  });
});
