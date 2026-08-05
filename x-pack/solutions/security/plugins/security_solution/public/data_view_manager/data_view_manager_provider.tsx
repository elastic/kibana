/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React, { useMemo } from 'react';

import { DataViewManagerProvider } from '@kbn/data-view-manager';
import type { DataViewManagerDependencies } from '@kbn/data-view-manager';

import { useKibana } from '../common/lib/kibana';
import { createDefaultDataView } from './utils/create_default_data_view';
import { createExploreDataView } from './utils/create_explore_data_view';

/**
 * Plugin-side wrapper around the package `DataViewManagerProvider`. It builds
 * the package dependency contract from the security solution kibana services
 * and injects the plugin-owned data view creation factories, then mounts the
 * package provider. Wrap any subtree that consumes the data view manager engine
 * hooks with this component.
 */
export const SecuritySolutionDataViewManagerProvider: FC<PropsWithChildren> = ({ children }) => {
  const { services } = useKibana();

  const dependencies = useMemo<DataViewManagerDependencies>(
    () => ({
      services: {
        dataViews: services.dataViews,
        spaces: services.spaces,
        http: services.http,
        application: services.application,
        uiSettings: services.uiSettings,
        notifications: services.notifications,
        storage: services.storage,
      },
      createDefaultDataView,
      createExploreDataView,
    }),
    [
      services.dataViews,
      services.spaces,
      services.http,
      services.application,
      services.uiSettings,
      services.notifications,
      services.storage,
    ]
  );

  return <DataViewManagerProvider dependencies={dependencies}>{children}</DataViewManagerProvider>;
};
