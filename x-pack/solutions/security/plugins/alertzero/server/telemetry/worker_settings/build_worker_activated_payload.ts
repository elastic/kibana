/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import type { AlertZeroAutonomyLevel } from '../constants';
import type { AlertZeroWorkerActivatedPayload } from '../event_types';
import { resolveWorkerCatalogFields } from '../envelope/resolve_worker_catalog_fields';

export interface BuildWorkerActivatedPayloadParams {
  /** The persisted autonomy level; omit it when the stored settings could not be read. */
  autonomyLevel?: AlertZeroAutonomyLevel;
  enabled: boolean;
  spaceId: string;
  workerId: string;
}

/** Builds the `alertzero_worker_activated` payload for a Worker's first install in a space. */
export const buildWorkerActivatedPayload = ({
  autonomyLevel,
  enabled,
  spaceId,
  workerId,
}: BuildWorkerActivatedPayloadParams): AlertZeroWorkerActivatedPayload => ({
  ...(autonomyLevel === undefined ? {} : { autonomy_level: autonomyLevel }),
  ...resolveWorkerCatalogFields(workerId),
  enabled,
  is_default_space: spaceId === DEFAULT_SPACE_ID,
});
