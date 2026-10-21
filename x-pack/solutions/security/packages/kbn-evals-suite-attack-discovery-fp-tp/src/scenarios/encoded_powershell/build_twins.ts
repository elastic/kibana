/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildAd2SeedPlan } from '@kbn/evals-suite-attack-discovery-agent-builder';
import { FP_TP_TWIN_SEED_LABEL, type FpTpTwin } from '../../world';
import { buildEncodedPowershellAttack } from './attack';
import { buildEncodedPowershellEntities } from './entities';
import { buildEncodedPowershellGold } from './gold';
import {
  ENCODED_POWERSHELL_CHAIN_BASE_TIME,
  ENCODED_POWERSHELL_SCENARIO_KEY,
  getEncodedPowershellIds,
  type EncodedPowershellVariant,
} from './ids';
import { overlayEncodedPowershellEvents } from './overlay_events';

/**
 * Builds one encoded-powershell twin. Alerts and the authored attack are shared;
 * entity store documents, raw-event overlays, and gold labels differ.
 *
 * Seeded documents never name the variant: the analysis reads them, so a variant
 * label would give the answer away.
 *
 * Every seeded id is a digest of `runMarker`, so two markers never share a document.
 */
export const buildEncodedPowershellTwin = (
  variant: EncodedPowershellVariant,
  runMarker: string = FP_TP_TWIN_SEED_LABEL
): FpTpTwin => {
  const plan = buildAd2SeedPlan({
    profile: 'clean',
    scenarioKey: ENCODED_POWERSHELL_SCENARIO_KEY,
    baseTime: ENCODED_POWERSHELL_CHAIN_BASE_TIME,
    runMarker,
  });

  return {
    id: `encoded-powershell.${variant}`,
    alerts: plan.alerts,
    events: overlayEncodedPowershellEvents(
      plan.rawEvents,
      variant,
      getEncodedPowershellIds(runMarker)
    ),
    entities: buildEncodedPowershellEntities(variant, runMarker),
    attack: buildEncodedPowershellAttack(runMarker),
    gold: buildEncodedPowershellGold(variant, runMarker),
  };
};
