/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import { coreMock } from '@kbn/core/public/mocks';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import type { ObservabilitySharedPluginStart } from '@kbn/observability-shared-plugin/public';
import { sharePluginMock } from '@kbn/share-plugin/public/mocks';
import { unifiedSearchPluginMock } from '@kbn/unified-search-plugin/public/mocks';
import type { StartServices } from './hooks/use_kibana';
import { createFixtureEntityInventoryApiClient } from './inventory_api/fixture_client';
import type { EntityInventoryAppStartDependencies } from './types';

const MockPageTemplate = ({ children }: { children?: React.ReactNode }) => (
  <div data-test-subj="mockPageTemplate">{children}</div>
);

export const createStartDependenciesMock = (): EntityInventoryAppStartDependencies => {
  const unifiedSearch = unifiedSearchPluginMock.createStartContract();
  unifiedSearch.ui.SearchBar = () => <div data-test-subj="mockSearchBar" />;

  const observabilityShared = {
    navigation: { PageTemplate: MockPageTemplate, registerSections: jest.fn() },
  } as unknown as ObservabilitySharedPluginStart;

  return {
    dataViews: dataViewPluginMocks.createStartContract(),
    observabilityShared,
    share: sharePluginMock.createStartContract(),
    unifiedSearch,
  };
};

/** Core start mock whose rendering context also supplies the chrome that `AppHeader` reads. */
export const createCoreStartMock = () => {
  const core = coreMock.createStart();
  const addContext = core.rendering.addContext.getMockImplementation();
  core.rendering.addContext.mockImplementation((element) => (
    <MockAppHeaderProvider>{addContext ? addContext(element) : element}</MockAppHeaderProvider>
  ));
  return core;
};

/** Services of the mounted app, with a fixture inventory client unless one is given. */
export const createAppServicesMock = (overrides: Partial<StartServices> = {}): StartServices => ({
  ...createCoreStartMock(),
  ...createStartDependenciesMock(),
  inventoryApi: createFixtureEntityInventoryApiClient(),
  ...overrides,
});
