/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiErrorBoundary } from '@elastic/eui';
import { AppMountParameters, APP_WRAPPER_CLASS, CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { KibanaThemeProvider } from '@kbn/react-kibana-context-theme';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import { Router } from '@kbn/shared-ux-router';
import React from 'react';
import ReactDOM from 'react-dom';
import { AppContext, ConfigSchema, ObservabilityOnboardingAppServices } from '..';
import { ObservabilityOnboardingHeaderActionMenu } from './shared/header_action_menu';
import {
  ObservabilityOnboardingPluginSetupDeps,
  ObservabilityOnboardingPluginStartDeps,
} from '../plugin';
import { ObservabilityOnboardingFlow } from './observability_onboarding_flow';

export const onBoardingTitle = i18n.translate(
  'xpack.observability_onboarding.breadcrumbs.onboarding',
  {
    defaultMessage: 'Onboarding',
  }
);

export const breadcrumbsApp = {
  id: 'observabilityOnboarding',
  label: onBoardingTitle,
};

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
    <KibanaRenderContextProvider {...core}>
      <div className={APP_WRAPPER_CLASS}>
        <RedirectAppLinks
          coreStart={{
            application: core.application,
          }}
        >
          <KibanaContextProvider services={services}>
            <KibanaThemeProvider
              theme={{ theme$ }}
              modify={{
                breakpoint: {
                  xxl: 1600,
                  xxxl: 2000,
                },
              }}
            >
              <Router history={history}>
                <EuiErrorBoundary>
                  <ObservabilityOnboardingHeaderActionMenu
                    setHeaderActionMenu={setHeaderActionMenu}
                    theme$={theme$}
                  />
                  <ObservabilityOnboardingFlow />
                </EuiErrorBoundary>
              </Router>
            </KibanaThemeProvider>
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
