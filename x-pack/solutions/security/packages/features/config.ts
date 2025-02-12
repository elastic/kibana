/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { securityDefaultProductFeaturesConfig } from './src/security/product_feature_config';
export { getCasesDefaultProductFeaturesConfig } from './src/cases/product_feature_config';
export { assistantDefaultProductFeaturesConfig } from './src/assistant/product_feature_config';
export { attackDiscoveryDefaultProductFeaturesConfig } from './src/attack_discovery/product_feature_config';
export { timelineDefaultProductFeaturesConfig } from './src/timeline/product_feature_config';
export { notesDefaultProductFeaturesConfig } from './src/notes/product_feature_config';
export { siemMigrationsDefaultProductFeaturesConfig } from './src/siem_migrations/product_feature_config';

export { createEnabledProductFeaturesConfigMap } from './src/helpers';
