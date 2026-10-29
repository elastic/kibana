/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useMemo } from 'react';
import type { Capabilities, HttpStart, NotificationsStart } from '@kbn/core/public';
import { FeatureFlagsApiClient } from './api_client';

export interface AppServices {
  http: HttpStart;
  notifications: NotificationsStart;
  canSave: boolean;
  api: FeatureFlagsApiClient;
}

const AppServicesContext = createContext<AppServices | undefined>(undefined);

export const canSaveFeatureFlags = (capabilities: Capabilities): boolean =>
  capabilities.featureFlagsManagement?.save === true;

export const AppServicesProvider = ({
  http,
  notifications,
  capabilities,
  children,
}: {
  http: HttpStart;
  notifications: NotificationsStart;
  capabilities: Capabilities;
  children: React.ReactNode;
}) => {
  const api = useMemo(() => new FeatureFlagsApiClient(http), [http]);
  const canSave = canSaveFeatureFlags(capabilities);
  const value = useMemo(
    () => ({ http, notifications, canSave, api }),
    [http, notifications, canSave, api]
  );
  return <AppServicesContext.Provider value={value}>{children}</AppServicesContext.Provider>;
};

export const useAppServices = (): AppServices => {
  const services = useContext(AppServicesContext);
  if (!services) {
    throw new Error('Feature flags services are unavailable');
  }
  return services;
};
