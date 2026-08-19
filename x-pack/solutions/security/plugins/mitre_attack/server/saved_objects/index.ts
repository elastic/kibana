/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsServiceSetup } from '@kbn/core/server';
import { mitreAttackEntitySavedObjectType } from './mitre_attack_entity';
import { mitreAttackPopulationMetaSavedObjectType } from './population_meta';

export { mitreAttackEntitySavedObjectType } from './mitre_attack_entity';
export { mitreAttackPopulationMetaSavedObjectType } from './population_meta';

export const registerSavedObjects = (so: SavedObjectsServiceSetup): void => {
  so.registerType(mitreAttackEntitySavedObjectType);
  so.registerType(mitreAttackPopulationMetaSavedObjectType);
};
