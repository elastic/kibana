/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';

import { getDashboardsLandingCallout } from './components/dashboards_landing_callout';
import type {
  SecuritySolutionServerlessPluginSetup,
  SecuritySolutionServerlessPluginStart,
  SecuritySolutionServerlessPluginSetupDeps,
  SecuritySolutionServerlessPluginStartDeps,
  ServerlessSecurityPublicConfig,
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

    this.experimentalFeatures = parseExperimentalConfigValue(
      this.config.enableExperimental,
      securitySolution.experimentalFeatures
    ).features;

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
    startNavigation(services);

    return {};
  }

  public stop() {}
}
