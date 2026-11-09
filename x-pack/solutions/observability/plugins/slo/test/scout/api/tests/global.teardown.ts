/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalTeardownHook, tags } from '@kbn/scout-oblt';
import { SLO_COMPOSITE_ENABLED } from '../../../../common/feature_flags';
import {
  removeSloScoutHostsDataForge,
  removeSloScoutStackData,
} from '../fixtures/slo_data_forge_lifecycle';

globalTeardownHook(
  'Teardown shared data and feature flags for SLO API tests',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  async ({ apiServices, esClient, kbnClient, log }) => {
    await apiServices.core.settings({
      'feature_flags.overrides': { [SLO_COMPOSITE_ENABLED]: null },
    });
    await removeSloScoutHostsDataForge(esClient, log);
    await removeSloScoutStackData(esClient, log);
    // Covers the data views, dashboards, searches, visualizations and tags imported by `generateSloData()`.
    await kbnClient.savedObjects.cleanStandardList();
  }
);
