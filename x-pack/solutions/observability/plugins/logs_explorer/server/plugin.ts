/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Plugin, CoreSetup } from '@kbn/core/server';
import { uiSettings } from '../common/ui_settings';
import type { LogsExplorerSetupDeps } from './types';

export class LogsExplorerServerPlugin implements Plugin {
  setup(core: CoreSetup, plugins: LogsExplorerSetupDeps) {
    core.uiSettings.register(uiSettings);

    return {};
  }

  start() {}
}
