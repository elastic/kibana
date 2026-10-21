/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';
import { act, render, screen } from '@testing-library/react';
import { coreMock } from '@kbn/core/public/mocks';
import { unifiedSearchPluginMock } from '@kbn/unified-search-plugin/public/mocks';
import { EntityInventoryAppPlugin } from './plugin';

const createStartDeps = () => {
  const unifiedSearch = unifiedSearchPluginMock.createStartContract();
  unifiedSearch.ui.SearchBar = () => <div data-test-subj="mockSearchBar" />;
  return { unifiedSearch };
};

const startPlugin = () =>
  new EntityInventoryAppPlugin().start(coreMock.createStart(), createStartDeps());

describe('EntityInventoryAppPlugin setup', () => {
  it('registers a standalone app that mounts the page shell with the start services', async () => {
    const coreSetup = coreMock.createSetup({ pluginStartDeps: createStartDeps() });
    new EntityInventoryAppPlugin().setup(coreSetup, {});
    const [[{ mount }]] = coreSetup.application.register.mock.calls;
    const mountParams = coreMock.createAppMountParameters();
    const { element } = mountParams;

    let unmount: () => void = () => {};
    await act(async () => {
      unmount = await mount(mountParams);
    });

    expect(element.querySelector('[data-test-subj="entityInventoryPageShell"]')).not.toBeNull();
    expect(element.querySelector('[data-test-subj="mockSearchBar"]')).not.toBeNull();

    act(() => unmount());
  });
});

describe('EntityInventoryAppPlugin start', () => {
  it('returns the same app component on every call', () => {
    const { getAppComponent } = startPlugin();

    expect(getAppComponent()).toBe(getAppComponent());
  });

  it('provides an app component that renders the page shell with the plugin services', async () => {
    const AppComponent = startPlugin().getAppComponent();

    render(
      <Suspense fallback={null}>
        <AppComponent entityType="hosts" />
      </Suspense>
    );

    expect(await screen.findByTestId('entityInventoryPageShell')).toHaveAttribute(
      'data-entity-type',
      'hosts'
    );
    expect(screen.getByTestId('mockSearchBar')).toBeInTheDocument();
  });
});
