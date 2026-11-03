/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTasksKibanaBridge } from '@kbn/core-plugins-server';
import type { MetricsDataClient } from '../client';

/**
 * The plugin's setup in Kibana, so a tasks entry that boots in the same process hands out the real
 * client (infra sets its default indices handler on it) instead of registering the saved object
 * type a second time. A task pod has no `server` entry and builds its own.
 */
export const metricsDataAccessBridge = createTasksKibanaBridge<{ client: MetricsDataClient }, {}>();
