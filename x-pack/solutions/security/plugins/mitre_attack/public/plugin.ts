/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { MitreAttackPublicSetup, MitreAttackPublicStart } from './types';

export class MitreAttackPublicPlugin
  implements Plugin<MitreAttackPublicSetup, MitreAttackPublicStart>
{
  private readonly config: { managedSourceEnabled: boolean };

  constructor(context: PluginInitializerContext) {
    this.config = context.config.get<{ managedSourceEnabled: boolean }>();
  }

  public setup(_core: CoreSetup): MitreAttackPublicSetup {
    return {};
  }

  public start(_core: CoreStart): MitreAttackPublicStart {
    return { isEnabled: this.config.managedSourceEnabled };
  }

  public stop(): void {}
}
