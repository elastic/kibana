/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OnStart } from '@kbn/core-di';
import type { ContainerModuleLoadOptions } from 'inversify';

/** Start-time work of the plugin. Empty for now: later phases add their initialisation here. `OnStart` is not awaited, so async work added here must catch its own errors. */
export function bindOnStart({ bind }: ContainerModuleLoadOptions): void {
  bind(OnStart).toConstantValue(() => {});
}
