/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import type { FC, PropsWithChildren } from 'react';
import React from 'react';
import {
  KibanaContextProvider,
  useKibana as useKibanaReact,
} from '@kbn/kibana-react-plugin/public';
import { NavigationProvider } from '@kbn/security-solution-navigation';
import type { SecuritySolutionEssPluginStartDeps } from '../types';

export type Services = CoreStart & SecuritySolutionEssPluginStartDeps;

export const KibanaServicesProvider: FC<
  PropsWithChildren<{
    services: Services;
  }>
> = ({ services, children }) => {
  return (
    <KibanaContextProvider services={services}>
      <NavigationProvider core={services}>{children}</NavigationProvider>
    </KibanaContextProvider>
  );
};

export const useKibana = () => useKibanaReact<Services>();

export const createServices = (
  core: CoreStart,
  pluginsStart: SecuritySolutionEssPluginStartDeps
): Services => {
  return { ...core, ...pluginsStart };
};

export const withServicesProvider = <T extends object>(
  Component: React.ComponentType<T>,
  services: Services
) => {
  return function WithServicesProvider(props: T) {
    return (
      <KibanaServicesProvider services={services}>
        <Component {...props} />
      </KibanaServicesProvider>
    );
  };
};
