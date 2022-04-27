/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Plugin, CoreSetup, CoreStart } from '@kbn/core/public';
import './types';

export class StackManagementUsageTest implements Plugin {
  public setup(core: CoreSetup) {}

  public start(core: CoreStart) {
    const allUiSettings = core.uiSettings.getAll();
    window.__registeredUiSettings__ = allUiSettings;
  }
}
