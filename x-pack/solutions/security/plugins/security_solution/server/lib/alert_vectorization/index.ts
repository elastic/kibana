/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { registerAlertVectorizationRoutes } from './routes';
export { extractAlertFeatures, composeFeatureText, hashFeatureText } from './feature_extraction';
export { createAlertVectorIndexService, type AlertVectorIndexService } from './vector_storage';
export { createAlertEmbeddingService, type AlertEmbeddingService } from './embedding';
export { createAlertSimilarityService, type AlertSimilarityService } from './similarity_search';
export * from './types';
