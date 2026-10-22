/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializer } from '@kbn/core/public';
import { EntityInventoryAppPlugin } from './plugin';
import type {
  EntityInventoryAppPublicSetup,
  EntityInventoryAppPublicStart,
  EntityInventoryAppSetupDependencies,
  EntityInventoryAppStartDependencies,
} from './types';

export type { EntityInventoryAppPublicSetup, EntityInventoryAppPublicStart };
export { INFRA_ENTITIES_INVENTORY_EXPERIENCE_KEY } from '../common/ui_settings_keys';

export const plugin: PluginInitializer<
  EntityInventoryAppPublicSetup,
  EntityInventoryAppPublicStart,
  EntityInventoryAppSetupDependencies,
  EntityInventoryAppStartDependencies
> = () => new EntityInventoryAppPlugin();
