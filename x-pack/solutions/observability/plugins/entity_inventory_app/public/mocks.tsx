/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import { coreMock } from '@kbn/core/public/mocks';
import type { ObservabilitySharedPluginStart } from '@kbn/observability-shared-plugin/public';
import { unifiedSearchPluginMock } from '@kbn/unified-search-plugin/public/mocks';
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

  return { observabilityShared, unifiedSearch };
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
