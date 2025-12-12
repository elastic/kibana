/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityType } from '../../../../../common/api/entity_analytics/entity_store';

// manually creating the index in the poc, quick re-use of existing mappings
export const generateLatestIndex = (entityType: EntityType, namespace: string) =>
  `.entities.v1.latest.security_${entityType}_${namespace}`;
