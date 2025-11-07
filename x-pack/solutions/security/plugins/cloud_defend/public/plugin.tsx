/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import React, { lazy, Suspense } from 'react';
import type { CloudDefendRouterProps } from './application/router';
import {
  CloudDefendPluginSetup,
  CloudDefendPluginStart,
  CloudDefendPluginStartDeps,
  CloudDefendPluginSetupDeps,
} from './types';
import { INTEGRATION_PACKAGE_NAME } from '../common/constants';
import { LoadingState } from './components/loading_state';
import { SetupContext } from './application/setup_context';

const LazyPolicyReplaceDefineStepExtension = lazy(
  () => import('./components/fleet_extensions/package_policy_replace_define_step_extension')
);

const RouterLazy = lazy(() => import('./application/router'));
const Router = (props: CloudDefendRouterProps) => (
  <Suspense fallback={<LoadingState />}>
    <RouterLazy {...props} />
  </Suspense>
);

export class CloudDefendPlugin
  implements
    Plugin<
      CloudDefendPluginSetup,
      CloudDefendPluginStart,
      CloudDefendPluginSetupDeps,
      CloudDefendPluginStartDeps
    >
{
  private isCloudEnabled?: boolean;

  public setup(
    core: CoreSetup<CloudDefendPluginStartDeps, CloudDefendPluginStart>,
    plugins: CloudDefendPluginSetupDeps
  ): CloudDefendPluginSetup {
    this.isCloudEnabled = plugins.cloud.isCloudEnabled;

    // Return methods that should be available to other plugins
    return {};
  }

  public start(core: CoreStart, plugins: CloudDefendPluginStartDeps): CloudDefendPluginStart {
    plugins.fleet.registerExtension({
      package: INTEGRATION_PACKAGE_NAME,
      view: 'package-policy-replace-define-step',
      Component: LazyPolicyReplaceDefineStepExtension,
    });

    const CloudDefendRouter = (props: CloudDefendRouterProps) => (
      <KibanaContextProvider services={{ ...core, ...plugins }}>
        <RedirectAppLinks coreStart={core}>
          <div css={{ width: '100%', height: '100%' }}>
            <SetupContext.Provider value={{ isCloudEnabled: this.isCloudEnabled }}>
              <Router {...props} />
            </SetupContext.Provider>
          </div>
        </RedirectAppLinks>
      </KibanaContextProvider>
    );

    return {
      getCloudDefendRouter: () => CloudDefendRouter,
    };
  }

  public stop() {}
}
