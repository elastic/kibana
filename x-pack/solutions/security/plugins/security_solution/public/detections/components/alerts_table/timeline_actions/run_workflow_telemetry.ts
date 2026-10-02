/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RunWorkflowTelemetry } from '@kbn/workflows-ui';
import { APP_ID } from '../../../../../common/constants';

/** Security surfaces reported as the `origin` of the shared run workflow telemetry event. */
export const RUN_WORKFLOW_TELEMETRY_ORIGIN = {
  alert: 'alert',
  alertBulk: 'alert_bulk',
  attack: 'attack',
  attackBulk: 'attack_bulk',
  document: 'document',
  documentBulk: 'document_bulk',
} as const;

export type RunWorkflowTelemetryOrigin =
  (typeof RUN_WORKFLOW_TELEMETRY_ORIGIN)[keyof typeof RUN_WORKFLOW_TELEMETRY_ORIGIN];

/**
 * Builds the `RunWorkflowPanel` telemetry context for a Security surface. A case attachment
 * context, when present, takes precedence because the run is then routed through Cases.
 */
export const getRunWorkflowTelemetry = (
  caseTelemetry: RunWorkflowTelemetry | undefined,
  origin: RunWorkflowTelemetryOrigin,
  itemCount: number
): RunWorkflowTelemetry => caseTelemetry ?? { origin, itemCount, owner: APP_ID };
