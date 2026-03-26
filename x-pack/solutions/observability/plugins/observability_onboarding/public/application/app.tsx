/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import { APP_WRAPPER_CLASS } from '@kbn/core/public';
import { PerformanceContextProvider } from '@kbn/ebt-tools';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import { Router } from '@kbn/shared-ux-router';
import React from 'react';
import ReactDOM from 'react-dom';
import type { AppContext, ConfigSchema, ObservabilityOnboardingAppServices } from '..';
import { ObservabilityOnboardingHeaderActionMenu } from './shared/header_action_menu';
import type {
  ObservabilityOnboardingPluginSetupDeps,
  ObservabilityOnboardingPluginStartDeps,
} from '../plugin';
import { ObservabilityOnboardingFlow } from './observability_onboarding_flow';

export function ObservabilityOnboardingAppRoot({
  appMountParameters,
  core,
  corePlugins,
  config,
  context,
}: {
  appMountParameters: AppMountParameters;
} & RenderAppProps) {
  const { history, setHeaderActionMenu, theme$ } = appMountParameters;
  const services: ObservabilityOnboardingAppServices = {
    ...core,
    ...corePlugins,
    config,
    context,
  };

  return (
    <KibanaRenderContextProvider
      {...core}
      theme={{ theme$ }}
      modify={{
        breakpoint: {
          xxl: 1600,
          xxxl: 2000,
        },
      }}
    >
      <div className={APP_WRAPPER_CLASS}>
        <RedirectAppLinks
          coreStart={{
            application: core.application,
          }}
        >
          <KibanaContextProvider services={services}>
            <Router history={history}>
              <PerformanceContextProvider>
                <>
                  <ObservabilityOnboardingHeaderActionMenu
                    setHeaderActionMenu={setHeaderActionMenu}
                    theme$={theme$}
                  />
                  <ObservabilityOnboardingFlow />
                </>
              </PerformanceContextProvider>
            </Router>
          </KibanaContextProvider>
        </RedirectAppLinks>
      </div>
    </KibanaRenderContextProvider>
  );
}

/**
 * This module is rendered asynchronously in the Kibana platform.
 */

interface RenderAppProps {
  core: CoreStart;
  deps: ObservabilityOnboardingPluginSetupDeps;
  appMountParameters: AppMountParameters;
  corePlugins: ObservabilityOnboardingPluginStartDeps;
  config: ConfigSchema;
  context: AppContext;
}

export const renderApp = (props: RenderAppProps) => {
  const { element } = props.appMountParameters;

  ReactDOM.render(<ObservabilityOnboardingAppRoot {...props} />, element);
  return () => {
    props.corePlugins.data.search.session.clear();
    ReactDOM.unmountComponentAtNode(element);
  };
};
