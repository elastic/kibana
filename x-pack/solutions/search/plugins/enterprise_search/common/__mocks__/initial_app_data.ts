/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const DEFAULT_INITIAL_APP_DATA = {
  kibanaVersion: '9.1.0',
  features: {
    hasConnectors: true,
    hasDefaultIngestPipeline: true,
    hasDocumentLevelSecurityEnabled: true,
    hasIncrementalSyncEnabled: true,
    hasNativeConnectors: false,
    hasWebCrawler: false,
  },
};
