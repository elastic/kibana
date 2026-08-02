/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PND_GATE_REGISTRY, isGateAutoAcceptable } from '@kbn/pnd-common';
import type { AutonomyAutoAccept, GetAutonomyResponse, WatchAutonomyLevel } from '@kbn/pnd-common';
import type { SystemSecurityWatchId } from '../is_system_security_watch_id';

/**
 * Build the flat autonomy response for a watch at a given level.
 *
 * The `autoAccept` map carries ONLY the gates the watch owns, each resolved
 * fail-closed via {@link isGateAutoAcceptable}: an `alwaysGate` gate is never
 * auto-acceptable at any level, and a level outside the shared scale auto-accepts nothing.
 * Gates the watch does not own are omitted entirely, so the orchestrator reads
 * a missing key fail-closed (`not …autoAccept.<gateId> : true` keeps the gate).
 */
export const buildAutonomyResponse = (
  watchId: SystemSecurityWatchId,
  autonomyLevel: WatchAutonomyLevel
): GetAutonomyResponse => {
  const autoAccept: AutonomyAutoAccept = PND_GATE_REGISTRY.filter(
    (gate) => gate.workflowId === watchId
  ).reduce<AutonomyAutoAccept>(
    (acc, gate) => ({
      ...acc,
      [gate.gateId]: isGateAutoAcceptable(gate.workflowId, gate.stepId, autonomyLevel),
    }),
    {}
  );

  return { autoAccept, autonomyLevel, watchId };
};
