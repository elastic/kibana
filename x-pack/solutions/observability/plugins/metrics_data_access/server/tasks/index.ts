/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreTasksSetup, TasksPlugin } from '@kbn/core/server';
import { MetricsDataClient } from '../client';
import { metricsDataSourceSavedObjectType } from '../saved_objects/metrics_data_source';
import { metricsDataAccessBridge } from './bridge';

export interface MetricsDataAccessTasksSetup {
  client: MetricsDataClient;
}

/**
 * Metrics data access for a task pod: the saved object type of the metric indices setting and the
 * client that resolves them (no routes). In a pod the plugins that set a default for the metric
 * indices (infra) do not run, so without a saved setting the client answers with its own default.
 * In Kibana this entry hands out the plugin's own contract (see `bridge.ts`).
 */
class MetricsDataAccessTasksPlugin implements TasksPlugin<MetricsDataAccessTasksSetup, {}> {
  setup(core: CoreTasksSetup): MetricsDataAccessTasksSetup {
    const real = metricsDataAccessBridge.getSetup();
    if (real) return real;

    core.savedObjects.registerType(metricsDataSourceSavedObjectType);
    return { client: new MetricsDataClient() };
  }

  start() {
    return {};
  }
}

export const plugin = async () => new MetricsDataAccessTasksPlugin();
