/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchNavigationPluginStart } from '../types';
import { BaseClassicNavItems } from '../base_classic_navigation_items';

function createStartMock(): SearchNavigationPluginStart {
  return {
    registerOnAppMountHandler: (onAppMount: () => Promise<void>) => {},
    handleOnAppMount: () => Promise.resolve(undefined),
    getBaseClassicNavItems: () => BaseClassicNavItems,
    useClassicNavigation: () => undefined,
    breadcrumbs: {
      setSearchBreadCrumbs: () => {},
      clearBreadcrumbs: () => {},
    },
  };
}

export const searchNavigationMock = {
  createStart: createStartMock,
};
