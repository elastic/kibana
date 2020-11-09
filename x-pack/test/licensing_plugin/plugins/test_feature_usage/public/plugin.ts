/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup } from 'src/core/server';
import { LicensingPluginSetup } from '../../../../../plugins/licensing/public';

interface SetupPlugins {
  licensing: LicensingPluginSetup;
}

export class TestFeatureUsagePlugin {
  public setup(core: CoreSetup, plugins: SetupPlugins) {
    plugins.licensing.featureUsage.register('test-client-A', 'gold');
    plugins.licensing.featureUsage.register('test-client-B', 'enterprise');
  }

  public start() {}
  public stop() {}
}
