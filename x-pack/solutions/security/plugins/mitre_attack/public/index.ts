/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext } from '@kbn/core/public';
import { MitreAttackPublicPlugin } from './plugin';

export type { MitreAttackPublicSetup, MitreAttackPublicStart } from './types';

export const plugin = (initializerContext: PluginInitializerContext): MitreAttackPublicPlugin =>
  new MitreAttackPublicPlugin(initializerContext);
