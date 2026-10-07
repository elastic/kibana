/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildAd2SeedPlan } from '../scenario_registry';
import { ENCODED_POWERSHELL_ATTACK } from './attack';
import {
  ENCODED_POWERSHELL_SCENARIO_KEY,
  FP_TP_BASE_TIME,
  FP_TP_TWIN_SEED_LABEL,
} from './constants';
import { ENCODED_POWERSHELL_FP_ENTITIES, ENCODED_POWERSHELL_TP_ENTITIES } from './entities';
import { ENCODED_POWERSHELL_FP_GOLD, ENCODED_POWERSHELL_TP_GOLD } from './gold';
import { overlayEncodedPowershellEvents } from './overlay_events';
import type { FpTpTwin, FpTpTwinVariant } from './types';

const withTwinAlertLabels = (
  alerts: FpTpTwin['alerts'],
  variant: FpTpTwinVariant
): FpTpTwin['alerts'] =>
  alerts.map((alert) => {
    const labels =
      typeof alert.source.labels === 'object' && alert.source.labels !== null
        ? (alert.source.labels as Record<string, unknown>)
        : {};
    return {
      ...alert,
      source: {
        ...alert.source,
        labels: {
          ...labels,
          ad_portable_seed: FP_TP_TWIN_SEED_LABEL,
          ad_fp_tp_twin: `encoded-powershell.${variant}`,
        },
      },
    };
  });

/**
 * Builds one encoded-powershell twin. Alerts and the authored attack are shared;
 * entity store documents, raw-event overlays, and gold labels differ.
 */
export const buildEncodedPowershellTwin = (variant: FpTpTwinVariant): FpTpTwin => {
  const plan = buildAd2SeedPlan({
    profile: 'clean',
    scenarioKey: ENCODED_POWERSHELL_SCENARIO_KEY,
    baseTime: FP_TP_BASE_TIME,
  });

  return {
    id: `encoded-powershell.${variant}`,
    alerts: withTwinAlertLabels(plan.alerts, variant),
    events: overlayEncodedPowershellEvents(plan.rawEvents, variant),
    entities: variant === 'tp' ? ENCODED_POWERSHELL_TP_ENTITIES : ENCODED_POWERSHELL_FP_ENTITIES,
    attack: ENCODED_POWERSHELL_ATTACK,
    gold: variant === 'tp' ? ENCODED_POWERSHELL_TP_GOLD : ENCODED_POWERSHELL_FP_GOLD,
  };
};
