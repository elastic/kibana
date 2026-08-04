/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React, { createContext, useContext, useMemo } from 'react';

import type { CoreStart } from '@kbn/core/public';
import type { DataView, DataViewsServicePublic } from '@kbn/data-views-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { Storage } from '@kbn/kibana-utils-plugin/public';

import type { initDataView } from './utils/init_data_view';

/**
 * The subset of Kibana runtime services the data view manager engine needs. The
 * host application supplies these when it mounts the provider; the package never
 * reaches into an ambient `useKibana()` context of its own.
 */
export interface DataViewManagerServices {
  dataViews: DataViewsServicePublic;
  spaces: SpacesPluginStart;
  http: CoreStart['http'];
  application: CoreStart['application'];
  uiSettings: CoreStart['uiSettings'];
  notifications: CoreStart['notifications'];
  storage: Storage;
}

/** Shape of a single data view entry produced during initialization. */
type DataViewEntry = typeof initDataView;

/** Result of the host-supplied default-data-view factory. */
export interface CreateDefaultDataViewResult {
  defaultDataView: DataViewEntry;
  alertDataView: DataViewEntry;
  attackDataView: DataViewEntry;
  kibanaDataViews: DataViewEntry[];
  signal: { name: string | null; index_mapping_outdated: boolean | null };
}

/**
 * Builds the initial set of security data views. This is application-specific
 * (it calls the security_solution initialization endpoint and checks
 * security_solution capabilities), so the host injects it rather than the
 * package owning it.
 */
export type CreateDefaultDataView = (deps: {
  http: CoreStart['http'];
  application: CoreStart['application'];
  skip?: boolean;
}) => Promise<CreateDefaultDataViewResult>;

/**
 * Builds the security "explore" data view. Application-specific because it
 * relies on security_solution constants (patterns, time field, name), so the
 * host injects it.
 */
export type CreateExploreDataView = (
  deps: { dataViews: DataViewsServicePublic; spaces: SpacesPluginStart },
  defaultDataViewPatterns: string[],
  alertsDataViewPattern: string
) => Promise<DataView>;

/**
 * Everything the data view manager engine needs from its host: Kibana services
 * plus the application-specific data view factories.
 */
export interface DataViewManagerDependencies {
  services: DataViewManagerServices;
  createDefaultDataView: CreateDefaultDataView;
  createExploreDataView: CreateExploreDataView;
}

const DataViewManagerDependenciesContext = createContext<DataViewManagerDependencies | undefined>(
  undefined
);

export interface DataViewManagerDependenciesProviderProps {
  dependencies: DataViewManagerDependencies;
}

/**
 * Shares the host-supplied dependencies (services + factories) with the rest of
 * the data view manager package.
 */
export const DataViewManagerDependenciesProvider: FC<
  PropsWithChildren<DataViewManagerDependenciesProviderProps>
> = ({ dependencies, children }) => {
  const value = useMemo(() => dependencies, [dependencies]);

  return (
    <DataViewManagerDependenciesContext.Provider value={value}>
      {children}
    </DataViewManagerDependenciesContext.Provider>
  );
};

/**
 * Access the host-supplied dependencies. Must be used within a
 * `DataViewManagerProvider`.
 */
export const useDataViewManagerDependencies = (): DataViewManagerDependencies => {
  const context = useContext(DataViewManagerDependenciesContext);
  if (context === undefined) {
    throw new Error(
      'useDataViewManagerDependencies can only be used within a DataViewManagerProvider'
    );
  }
  return context;
};

/** Convenience accessor for just the Kibana services. */
export const useDataViewManagerServices = (): DataViewManagerServices =>
  useDataViewManagerDependencies().services;
