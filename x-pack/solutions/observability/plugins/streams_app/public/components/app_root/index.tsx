/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import React from 'react';
import {
  ThemeServiceStart,
  type AppMountParameters,
  type CoreStart,
  type UserProfileService,
} from '@kbn/core/public';
import {
  BreadcrumbsContextProvider,
  RouteRenderer,
  RouterProvider,
} from '@kbn/typed-react-router-config';
import { HeaderMenuPortal } from '@kbn/observability-shared-plugin/public';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { StreamsAppContextProvider } from '../streams_app_context_provider';
import { streamsAppRouter } from '../../routes/config';
import { StreamsAppStartDependencies } from '../../types';
import { StreamsAppServices } from '../../services/types';

export function AppRoot({
  coreStart,
  pluginsStart,
  services,
  appMountParameters,
}: {
  coreStart: CoreStart;
  pluginsStart: StreamsAppStartDependencies;
  services: StreamsAppServices;
} & { appMountParameters: AppMountParameters }) {
  const { history } = appMountParameters;

  const context = {
    core: coreStart,
    dependencies: {
      start: pluginsStart,
    },
    services,
  };

  return (
    <StreamsAppContextProvider context={context}>
      <RedirectAppLinks coreStart={coreStart}>
        <RouterProvider history={history} router={streamsAppRouter}>
          <BreadcrumbsContextProvider>
            <RouteRenderer />
          </BreadcrumbsContextProvider>
          <StreamsAppHeaderActionMenu appMountParameters={appMountParameters} {...coreStart} />
        </RouterProvider>
      </RedirectAppLinks>
    </StreamsAppContextProvider>
  );
}

interface StreamsAppHeaderActionMenuProps {
  appMountParameters: AppMountParameters;
  theme: ThemeServiceStart;
  userProfile: UserProfileService;
}

export function StreamsAppHeaderActionMenu({
  appMountParameters,
  ...startServices
}: StreamsAppHeaderActionMenuProps) {
  const { setHeaderActionMenu } = appMountParameters;

  return (
    <HeaderMenuPortal setHeaderActionMenu={setHeaderActionMenu} {...startServices}>
      <EuiFlexGroup responsive={false} gutterSize="s">
        <EuiFlexItem>
          <></>
        </EuiFlexItem>
      </EuiFlexGroup>
    </HeaderMenuPortal>
  );
}
