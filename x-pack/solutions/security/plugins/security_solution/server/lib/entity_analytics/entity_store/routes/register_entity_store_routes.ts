/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityAnalyticsRoutesDeps } from '../../types';
import { applyDataViewIndicesEntityEngineRoute } from './apply_dataview_indices';
import { deleteEntityEngineRoute, deleteEntityEnginesRoute } from './delete';
import { listEntitiesRoute } from './entities/list';
import { getEntityEngineRoute } from './get';
import { initEntityEngineRoute } from './init';
import { listEntityEnginesRoute } from './list';
import { entityStoreInternalPrivilegesRoute } from './privileges';
import { startEntityEngineRoute } from './start';
import { stopEntityEngineRoute } from './stop';
import { getEntityStoreStatusRoute } from './status';
import { enableEntityStoreRoute } from './enablement';
import { upsertEntity } from './entity_crud/upsert_entity';
import { upsertEntitiesBulk } from './entity_crud/upsert_entities_bulk';
import { deleteEntity } from './entity_crud/delete_entity';

export const registerEntityStoreRoutes = ({
  router,
  logger,
  getStartServices,
  telemetrySender: telemetry,
  config,
}: EntityAnalyticsRoutesDeps) => {
  enableEntityStoreRoute(router, logger, telemetry, config);
  getEntityStoreStatusRoute(router, logger, telemetry, config);
  initEntityEngineRoute(router, logger, telemetry, config);
  startEntityEngineRoute(router, telemetry, logger);
  stopEntityEngineRoute(router, telemetry, logger);
  deleteEntityEngineRoute(router, telemetry, logger, getStartServices);
  deleteEntityEnginesRoute(router, telemetry, logger, getStartServices);
  getEntityEngineRoute(router, telemetry, logger);
  listEntityEnginesRoute(router, telemetry, logger);
  listEntitiesRoute(router, telemetry, logger);
  applyDataViewIndicesEntityEngineRoute(router, telemetry, logger);
  entityStoreInternalPrivilegesRoute(router, telemetry, logger, getStartServices);
  upsertEntity(router, telemetry, logger);
  upsertEntitiesBulk(router, telemetry, logger);
  deleteEntity(router, telemetry, logger);
};
