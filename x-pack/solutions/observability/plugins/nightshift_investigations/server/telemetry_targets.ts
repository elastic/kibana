/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { badRequest } from '@hapi/boom';
import type { NightshiftInvestigationsConfig } from './config';
import { telemetryTargetNameSchema } from '../common/telemetry_targets';

export interface TelemetryTarget {
  connectorId?: string;
  readableIndices?: string;
}

export const resolveTelemetryTarget = (
  sandbox: NightshiftInvestigationsConfig['sandbox'],
  requestedTarget?: string
): TelemetryTarget => {
  const target = requestedTarget || sandbox?.default_telemetry_target;
  if (!target) {
    return {
      connectorId: sandbox?.telemetry_connector_id,
      readableIndices: sandbox?.telemetry_readable_indices,
    };
  }
  if (target === 'none') return {};
  if (!telemetryTargetNameSchema.safeParse(target).success) {
    throw badRequest('Invalid telemetry target name');
  }
  const configured = Object.hasOwn(sandbox?.telemetry_targets ?? {}, target)
    ? sandbox?.telemetry_targets[target]
    : undefined;
  if (!configured) throw badRequest(`Unknown telemetry target: ${target}`);
  return { connectorId: configured.connector_id, readableIndices: configured.readable_indices };
};

export const getTelemetryTargets = (
  sandbox: NightshiftInvestigationsConfig['sandbox']
): TelemetryTarget[] => [
  ...(sandbox?.telemetry_connector_id
    ? [
        {
          connectorId: sandbox.telemetry_connector_id,
          readableIndices: sandbox.telemetry_readable_indices,
        },
      ]
    : []),
  ...Object.values(sandbox?.telemetry_targets ?? {}).map(({ connector_id, readable_indices }) => ({
    connectorId: connector_id,
    readableIndices: readable_indices,
  })),
];
