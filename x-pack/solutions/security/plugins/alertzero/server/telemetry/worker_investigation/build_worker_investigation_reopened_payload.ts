/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import type { AlertZeroWorkerInvestigationReopenedPayload } from '../event_types';
import { resolveWorkerCatalogFields } from '../envelope/resolve_worker_catalog_fields';

export interface BuildWorkerInvestigationReopenedPayloadParams {
  investigationId: string;
  spaceId: string;
  /** The catalog id of the Worker that reopened the Investigation. */
  workerId: string;
}

/** Builds the `alertzero_worker_investigation_reopened` payload for a Worker's own reopen. */
export const buildWorkerInvestigationReopenedPayload = ({
  investigationId,
  spaceId,
  workerId,
}: BuildWorkerInvestigationReopenedPayloadParams): AlertZeroWorkerInvestigationReopenedPayload => ({
  ...resolveWorkerCatalogFields(workerId),
  investigation_id: investigationId,
  is_default_space: spaceId === DEFAULT_SPACE_ID,
});
