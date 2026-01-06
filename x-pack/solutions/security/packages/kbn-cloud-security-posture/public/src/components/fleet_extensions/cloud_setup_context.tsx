/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { createContext } from 'react';
import type { IUiSettingsClient } from '@kbn/core/public';
import type { CloudSetup } from '@kbn/cloud-plugin/public';
import type { NewPackagePolicy, PackageInfo } from '@kbn/fleet-plugin/common';
import type { CloudSetupConfig } from './types';

interface CloudSetupContextValue {
  config: CloudSetupConfig;
  uiSettings: IUiSettingsClient;
  cloud: CloudSetup;
  packagePolicy: NewPackagePolicy;
  packageInfo: PackageInfo;
}

export const CloudSetupContext = createContext<CloudSetupContextValue | undefined>(undefined);

export const CloudSetupProvider = ({
  packagePolicy,
  packageInfo,
  config,
  uiSettings,
  cloud,
  children,
}: {
  packagePolicy: NewPackagePolicy;
  packageInfo: PackageInfo;
  config: CloudSetupConfig;
  uiSettings: IUiSettingsClient;
  cloud: CloudSetup;
  children: React.ReactNode;
}) => {
  return (
    <CloudSetupContext.Provider value={{ config, cloud, uiSettings, packagePolicy, packageInfo }}>
      {children}
    </CloudSetupContext.Provider>
  );
};
