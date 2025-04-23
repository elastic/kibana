/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { startNavigation } from './navigation';
import { createServices } from './common/services';
import { registerUpsellings } from './upselling/register_upsellings';
import type {
  SecuritySolutionEssPluginSetup,
  SecuritySolutionEssPluginStart,
  SecuritySolutionEssPluginSetupDeps,
  SecuritySolutionEssPluginStartDeps,
} from './types';
import { setOnboardingSettings } from './onboarding';
import { DEFAULT_PRODUCT_FEATURES } from '../common/constants';

export class SecuritySolutionEssPlugin
  implements
    Plugin<
      SecuritySolutionEssPluginSetup,
      SecuritySolutionEssPluginStart,
      SecuritySolutionEssPluginSetupDeps,
      SecuritySolutionEssPluginStartDeps
    >
{
  public setup(
    _core: CoreSetup,
    setupDeps: SecuritySolutionEssPluginSetupDeps
  ): SecuritySolutionEssPluginSetup {
    const { securitySolution } = setupDeps;

    securitySolution.setProductFeatureKeys(DEFAULT_PRODUCT_FEATURES);

    return {};
  }

  public start(
    core: CoreStart,
    startDeps: SecuritySolutionEssPluginStartDeps
  ): SecuritySolutionEssPluginStart {
    const { securitySolution, licensing } = startDeps;
    const services = createServices(core, startDeps);

    startNavigation(services);
    setOnboardingSettings(services);

    licensing.license$.subscribe((license) => {
      registerUpsellings(securitySolution.getUpselling(), license, services);
    });

    return {};
  }

  public stop() {}
}
