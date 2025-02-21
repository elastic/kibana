/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esqlRoutes } from './esql/route';
import { dashboardRoutes } from './dashboards/route';
import { crudRoutes } from './streams/crud/route';
import { enablementRoutes } from './streams/enablement/route';
import { managementRoutes } from './streams/management/route';
import { schemaRoutes } from './streams/schema/route';
import { processingRoutes } from './streams/processing/route';
import { ingestRoutes } from './streams/ingest/route';
import { groupRoutes } from './streams/group/route';

export const streamsRouteRepository = {
  ...esqlRoutes,
  ...dashboardRoutes,
  ...crudRoutes,
  ...enablementRoutes,
  ...managementRoutes,
  ...schemaRoutes,
  ...processingRoutes,
  ...ingestRoutes,
  ...groupRoutes,
};

export type StreamsRouteRepository = typeof streamsRouteRepository;
