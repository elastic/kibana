/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type { NewPackagePolicy, PackageInfo } from '@kbn/fleet-plugin/common';
import type { CloudSetup } from '@kbn/cloud-plugin/public/types';
import { createFleetTestRendererMock } from '@kbn/fleet-plugin/public/mock';
import { I18nProvider } from '@kbn/i18n-react';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import type { CloudSetupConfig } from '../../types';
import { CloudSetupProvider } from '../../cloud_setup_context';

export const CloudSetupTestWrapper = ({
  newPolicy,
  packageInfo,
  config,
  cloud,
  uiSettings,
  children,
}: {
  newPolicy: NewPackagePolicy;
  packageInfo: PackageInfo;
  config: CloudSetupConfig;
  cloud: CloudSetup;
  uiSettings: IUiSettingsClient;
  children: React.ReactNode;
}) => {
  const { AppWrapper: FleetAppWrapper } = createFleetTestRendererMock();

  return (
    <I18nProvider>
      <FleetAppWrapper>
        <CloudSetupProvider
          config={config}
          cloud={cloud}
          uiSettings={uiSettings}
          packageInfo={packageInfo}
          packagePolicy={newPolicy}
        >
          {children}
        </CloudSetupProvider>
      </FleetAppWrapper>
    </I18nProvider>
  );
};
