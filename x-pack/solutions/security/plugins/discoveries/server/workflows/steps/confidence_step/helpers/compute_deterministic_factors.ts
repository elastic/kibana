/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { computeConfidenceFactors } from '@kbn/discoveries/impl/confidence';
import type { DeterministicFactors, ParsedAlertFields } from '@kbn/discoveries/impl/confidence';
import type { AttackDiscovery } from '../../../../../common/step_types/shared_schemas';

export { toBand } from '@kbn/discoveries/impl/confidence';
export type { DeterministicFactors } from '@kbn/discoveries/impl/confidence';

/**
 * Attack-Discovery adapter over the reusable confidence core: selects the
 * discovery's cited alert rows and scores the bundle, falling back to the
 * discovery's MITRE tactic names when the alerts carry no `threat.tactic.id`.
 */
export const computeDeterministicFactors = ({
  discovery,
  rowsById,
}: {
  discovery: AttackDiscovery;
  rowsById: Map<string, ParsedAlertFields>;
}): DeterministicFactors => {
  const alertIds = discovery.alert_ids ?? [];
  const alertRows = alertIds
    .map((id) => rowsById.get(id))
    .filter((row): row is ParsedAlertFields => row != null);

  return computeConfidenceFactors({
    alertRows,
    alertCount: alertIds.length,
    mitreTacticNamesFallback: discovery.mitre_attack_tactics,
  });
};
