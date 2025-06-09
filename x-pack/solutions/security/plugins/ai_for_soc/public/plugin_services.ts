/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart } from '@kbn/core/public';
import type { AppMountParameters } from '@kbn/core/public';
import type { SecuritySolutionAiForSocStartPluginDependencies } from './types';

export class PluginServices {
  constructor() {}

  public setup(core: CoreSetup, plugins: SecuritySolutionAiForSocStartPluginDependencies) {}

  public async generateServices(
    coreStart: CoreStart,
    startPlugins: SecuritySolutionAiForSocStartPluginDependencies,
    params?: AppMountParameters
  ) {
    return {
      ...coreStart,
      ...startPlugins,
      ...(params && {
        onAppLeave: params.onAppLeave,
        setHeaderActionMenu: params.setHeaderActionMenu,
      }),
    };
  }

  public stop() {}
}
