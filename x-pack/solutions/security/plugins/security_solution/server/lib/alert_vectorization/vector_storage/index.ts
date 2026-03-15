/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  createAlertVectorIndexService,
  type AlertVectorIndexService,
  type AlertVectorIndexServiceDeps,
} from './alert_vector_index_service';
export { generateAlertVectorIndexMappings } from './mappings';
