/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import { ConfigType } from '../common/types';

export class SecuritySolutionAiForSocPlugin
  implements Plugin<void, void, Record<string, unknown>, Record<string, unknown>>
{
  private readonly config: ConfigType;

  constructor(private readonly initializerContext: PluginInitializerContext<ConfigType>) {
    this.config = initializerContext.config.get<ConfigType>();
  }

  public setup(core: CoreSetup) {}

  public start(core: CoreStart) {}

  public stop() {}
}
