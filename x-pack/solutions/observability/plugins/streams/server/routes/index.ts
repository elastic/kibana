/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esqlRoutes } from './esql/route';
import { deleteStreamRoute } from './streams/delete';
import { disableStreamsRoute } from './streams/disable';
import { editStreamRoute } from './streams/edit';
import { enableStreamsRoute } from './streams/enable';
import { forkStreamsRoute } from './streams/fork';
import { listStreamsRoute } from './streams/list';
import { readStreamRoute } from './streams/read';
import { resyncStreamsRoute } from './streams/resync';
import { sampleStreamRoute } from './streams/sample';
import { schemaFieldsSimulationRoute } from './streams/schema/fields_simulation';
import { unmappedFieldsRoute } from './streams/schema/unmapped_fields';
import { streamsStatusRoutes } from './streams/settings';

export const streamsRouteRepository = {
  ...enableStreamsRoute,
  ...resyncStreamsRoute,
  ...forkStreamsRoute,
  ...readStreamRoute,
  ...editStreamRoute,
  ...deleteStreamRoute,
  ...listStreamsRoute,
  ...streamsStatusRoutes,
  ...esqlRoutes,
  ...disableStreamsRoute,
  ...sampleStreamRoute,
  ...unmappedFieldsRoute,
  ...schemaFieldsSimulationRoute,
};

export type StreamsRouteRepository = typeof streamsRouteRepository;
