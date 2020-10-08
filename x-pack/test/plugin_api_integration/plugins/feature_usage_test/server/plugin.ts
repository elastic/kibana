/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin, CoreSetup } from 'kibana/server';
import {
  LicensingPluginSetup,
  LicensingPluginStart,
} from '../../../../../plugins/licensing/server';
import { registerRoutes } from './routes';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface FeatureUsageTestPluginSetup {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface FeatureUsageTestPluginStart {}

export interface FeatureUsageTestSetupDependencies {
  licensing: LicensingPluginSetup;
}
export interface FeatureUsageTestStartDependencies {
  licensing: LicensingPluginStart;
}

export class FeatureUsageTestPlugin
  implements
    Plugin<
      FeatureUsageTestPluginSetup,
      FeatureUsageTestPluginStart,
      FeatureUsageTestSetupDependencies,
      FeatureUsageTestStartDependencies
    > {
  public setup(
    {
      http,
      getStartServices,
    }: CoreSetup<FeatureUsageTestStartDependencies, FeatureUsageTestPluginStart>,
    { licensing }: FeatureUsageTestSetupDependencies
  ) {
    licensing.featureUsage.register('Test feature A', 'basic');
    licensing.featureUsage.register('Test feature B', 'gold');
    licensing.featureUsage.register('Test feature C', 'platinum');

    registerRoutes(http.createRouter(), getStartServices);

    return {};
  }

  public start() {
    return {};
  }
}
