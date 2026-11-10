/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegistrableEntityDefinition } from '@kbn/entity-store/server';
import { KUBERNETES_DEFINITIONS } from './kubernetes';

/** Every definition this plugin registers with the entity store during setup. */
export const ENTITY_DEFINITIONS: readonly RegistrableEntityDefinition[] = [
  ...KUBERNETES_DEFINITIONS,
];
