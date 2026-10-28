/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { SignificantEventsMaintenanceService } from '../../../lib/maintenance/maintenance_service';
import type { GetScopedClients } from '../../../routes/types';
import type { SignificantEventsServer } from '../../../types';

/** The dependencies every source tool takes. */
export interface SourceToolDeps {
  getScopedClients: GetScopedClients;
  server: SignificantEventsServer;
  logger: Logger;
}

/** The part of the maintenance service the source tools read to tell whether the space is paused. */
export type MaintenanceStateReader = Pick<SignificantEventsMaintenanceService, 'getState'>;
