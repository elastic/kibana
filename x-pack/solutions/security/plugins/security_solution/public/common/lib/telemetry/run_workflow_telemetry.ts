/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RunWorkflowTelemetry } from '@kbn/workflows-ui';
import { APP_ID } from '../../../../common/constants';

/** Security surfaces reported as the `origin` of the shared run workflow telemetry event. */
const RUN_WORKFLOW_TELEMETRY_ORIGIN = {
  alert: { single: 'alert', bulk: 'alert_bulk' },
  attack: { single: 'attack', bulk: 'attack_bulk' },
  document: { single: 'document', bulk: 'document_bulk' },
} as const;

export type RunWorkflowTelemetrySurface = keyof typeof RUN_WORKFLOW_TELEMETRY_ORIGIN;

export interface GetRunWorkflowTelemetryParams {
  surface: RunWorkflowTelemetrySurface;
  isBulk: boolean;
  itemCount: number;
}

/** Builds the `RunWorkflowPanel` telemetry a Security surface reports outside a case. */
export const getRunWorkflowTelemetry = ({
  surface,
  isBulk,
  itemCount,
}: GetRunWorkflowTelemetryParams): RunWorkflowTelemetry => ({
  origin: RUN_WORKFLOW_TELEMETRY_ORIGIN[surface][isBulk ? 'bulk' : 'single'],
  itemCount,
  owner: APP_ID,
});
