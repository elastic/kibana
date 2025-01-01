/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityType } from '../../common/rt_types';

export function groupEntityTypesByStatus(entityTypes: EntityType) {
  const entityTypesKeys = Object.keys(entityTypes);
  return {
    entityTypesOn: entityTypesKeys.filter((key) => entityTypes[key] === 'on').sort(),
    entityTypesOff: entityTypesKeys.filter((key) => entityTypes[key] === 'off').sort(),
  };
}
