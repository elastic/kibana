/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AppUpdater,
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/public';
import { BehaviorSubject } from 'rxjs';
import { AppStatus } from '@kbn/core-application-browser';

import { getDashboardsLandingCallout } from './components/dashboards_landing_callout';
import type { ServerlessSecurityPublicConfig } from '../common/config';
import type {
  SecuritySolutionServerlessPluginSetup,
  SecuritySolutionServerlessPluginStart,
  SecuritySolutionServerlessPluginSetupDeps,
  SecuritySolutionServerlessPluginStartDeps,
} from './types';
import { registerUpsellings } from './upselling';
import { createServices } from './common/services/create_services';
import { startNavigation } from './navigation';
import {
  parseExperimentalConfigValue,
  type ExperimentalFeatures,
} from '../common/experimental_features';
import { setOnboardingSettings } from './onboarding';
import { getAdditionalChargesMessage } from './components/additional_charges_message';
import { getEnabledProductFeatures } from '../common/pli/pli_features';

export class SecuritySolutionServerlessPlugin
  implements
    Plugin<
      SecuritySolutionServerlessPluginSetup,
      SecuritySolutionServerlessPluginStart,
      SecuritySolutionServerlessPluginSetupDeps,
      SecuritySolutionServerlessPluginStartDeps
    >
{
  private config: ServerlessSecurityPublicConfig;
  private experimentalFeatures: ExperimentalFeatures;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.config = this.initializerContext.config.get<ServerlessSecurityPublicConfig>();
    this.experimentalFeatures = {} as ExperimentalFeatures;
  }

  public setup(
    core: CoreSetup,
    setupDeps: SecuritySolutionServerlessPluginSetupDeps
  ): SecuritySolutionServerlessPluginSetup {
    const { securitySolution } = setupDeps;
    const { productTypes, enableExperimental, inaccessibleApps } = this.config;

    this.experimentalFeatures = parseExperimentalConfigValue(
      enableExperimental,
      securitySolution.experimentalFeatures
    ).features;

    securitySolution.setProductFeatureKeys(getEnabledProductFeatures(productTypes));

    updateInaccessibleApps(inaccessibleApps, core);

    return {};
  }

  public start(
    core: CoreStart,
    startDeps: SecuritySolutionServerlessPluginStartDeps
  ): SecuritySolutionServerlessPluginStart {
    const { securitySolution } = startDeps;
    const { productTypes } = this.config;
    const services = createServices(core, startDeps, this.experimentalFeatures);

    registerUpsellings(productTypes, services);

    securitySolution.setComponents({
      DashboardsLandingCallout: getDashboardsLandingCallout(services),
      AdditionalChargesMessage: getAdditionalChargesMessage(services),
    });

    setOnboardingSettings(services);
    startNavigation(services, productTypes);

    return {};
  }

  public stop() {}
}

/**
 * Disables apps that are inaccessible based on the provided configuration.
 * It updates the app status to 'inaccessible' for those apps.
 * The apps will still execute their lifecycle methods, but it will remain inaccessible in the UI.
 */
const updateInaccessibleApps = (inaccessibleApps: string[], core: CoreSetup) => {
  if (!inaccessibleApps?.length) {
    return;
  }

  const inaccessibleAppsSet = new Set(inaccessibleApps);
  const appUpdater$ = new BehaviorSubject<AppUpdater>((app) => {
    if (inaccessibleAppsSet.has(app.id)) {
      return { status: AppStatus.inaccessible };
    }
  });

  core.application.registerAppUpdater(appUpdater$);
};
