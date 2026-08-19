/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type {
  MitreFramework,
  MitreEntityType,
  MitreTactic,
  MitreTechnique,
  MitreSubtechnique,
  MitreEntity,
  MitreEntityAttributes,
} from './schema';

export {
  MITRE_ATTACK_ENTITY_SO_TYPE,
  MITRE_ATTACK_POPULATION_META_SO_TYPE,
  MITRE_INFERENCE_ID,
  MITRE_ENTITIES_URL,
  MITRE_SEARCH_URL,
} from './constants';
