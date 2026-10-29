/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { LIMITS, type App, type Environment } from '../../common';
import { useAppServices } from './app_services';
import { useAsyncData } from './use_async_data';

export interface Catalog {
  apps: App[];
  environments: Environment[];
  appsTruncated: boolean;
  environmentsTruncated: boolean;
}

export const useCatalog = () => {
  const { api } = useAppServices();
  const load = useCallback(
    () =>
      Promise.all([
        api.listApps(1, LIMITS.maxEntitiesPerPage),
        api.listEnvironments(1, LIMITS.maxEntitiesPerPage),
      ]).then(([apps, environments]) => ({
        apps: apps.items,
        environments: environments.items,
        appsTruncated: apps.total > apps.items.length,
        environmentsTruncated: environments.total > environments.items.length,
      })),
    [api]
  );
  return useAsyncData(load);
};
