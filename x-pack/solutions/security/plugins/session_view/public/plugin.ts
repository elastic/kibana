/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type CoreSetup, type CoreStart, type Plugin } from '@kbn/core/public';
import {
  type SessionViewPluginStart,
  type SessionViewPluginStartDeps,
  type SessionViewPluginSetup,
  type SessionViewPluginSetupDeps,
  type SessionViewDeps,
} from './types';
import { getSessionViewLazy } from './methods';

export class SessionViewPlugin implements Plugin<SessionViewPluginStart, SessionViewPluginSetup> {
  public setup(core: CoreSetup<SessionViewPluginSetupDeps, SessionViewPluginSetup>) {
    return {};
  }

  public start(core: CoreStart, plugins: SessionViewPluginStartDeps): SessionViewPluginStart {
    return {
      getSessionView: (sessionViewDeps: SessionViewDeps) =>
        getSessionViewLazy({ ...sessionViewDeps, usageCollection: plugins?.usageCollection }),
    };
  }

  public stop() {}
}
