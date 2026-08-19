/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Plugin, CoreSetup, CoreStart, PluginInitializerContext } from '@kbn/core/public';
import type { MitreAttackConfig } from '../server/config';

export interface MitreAttackPublicPluginSetup {
  isManagedSourceEnabled: boolean;
}

export interface MitreAttackPublicPluginStart {
  isManagedSourceEnabled: boolean;
}

export class MitreAttackPublicPlugin
  implements Plugin<MitreAttackPublicPluginSetup, MitreAttackPublicPluginStart>
{
  private readonly isManagedSourceEnabled: boolean;

  constructor(initializerContext: PluginInitializerContext<MitreAttackConfig>) {
    const config = initializerContext.config.get();
    this.isManagedSourceEnabled = config.managedSourceEnabled;
  }

  public setup(_core: CoreSetup): MitreAttackPublicPluginSetup {
    return {
      isManagedSourceEnabled: this.isManagedSourceEnabled,
    };
  }

  public start(_core: CoreStart): MitreAttackPublicPluginStart {
    return {
      isManagedSourceEnabled: this.isManagedSourceEnabled,
    };
  }
}
