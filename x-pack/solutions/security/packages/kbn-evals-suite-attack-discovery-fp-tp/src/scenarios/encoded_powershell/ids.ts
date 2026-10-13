/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ad2SeedId } from '@kbn/evals-suite-attack-discovery-agent-builder';
import { FP_TP_BASE_TIME, FP_TP_TWIN_SEED_LABEL } from '../../world';

export type EncodedPowershellVariant = 'tp' | 'fp';

/**
 * Base time handed to the scenario registry, which starts the chain two hours
 * before it. One hour after the attack's `@timestamp` puts every alert and raw
 * event inside the analysis's ±2h raw-event window around that timestamp.
 */
export const ENCODED_POWERSHELL_CHAIN_BASE_TIME = new Date(
  FP_TP_BASE_TIME.getTime() + 60 * 60 * 1000
);

export const ENCODED_POWERSHELL_SCENARIO_KEY = 'encoded-powershell';

export const ENCODED_POWERSHELL_HOST = 'wks-alice-01';

export const ENCODED_POWERSHELL_USER = 'alice.chen';

export const ENCODED_POWERSHELL_ATTACK_ID = 'ad-fp-tp-encoded-powershell-attack';

export interface EncodedPowershellIds {
  readonly hostId: string;
  readonly hostEntityId: string;
  readonly userEntityId: string;
  readonly process1Id: string;
  readonly network2Id: string;
  readonly process3Id: string;
  readonly file3Id: string;
  readonly process4Id: string;
  readonly network4Id: string;
}

/**
 * The seeded ids the twins overlay and the gold cites. They are digests of the
 * run marker (see the scenario registry's `ids.ts`), so they are resolved through
 * the same function the registry writes them with.
 */
export const getEncodedPowershellIds = (
  runMarker: string = FP_TP_TWIN_SEED_LABEL
): EncodedPowershellIds => {
  const hostId = ad2SeedId(runMarker, 'host', ENCODED_POWERSHELL_HOST);
  return {
    hostId,
    hostEntityId: `host:${hostId}`,
    userEntityId: `user:${ENCODED_POWERSHELL_USER}@${hostId}@local`,
    process1Id: ad2SeedId(runMarker, 'process', ENCODED_POWERSHELL_SCENARIO_KEY, 1),
    network2Id: ad2SeedId(runMarker, 'network', ENCODED_POWERSHELL_SCENARIO_KEY, 2),
    process3Id: ad2SeedId(runMarker, 'process', ENCODED_POWERSHELL_SCENARIO_KEY, 3),
    file3Id: ad2SeedId(runMarker, 'file', ENCODED_POWERSHELL_SCENARIO_KEY, 3),
    process4Id: ad2SeedId(runMarker, 'process', ENCODED_POWERSHELL_SCENARIO_KEY, 4),
    network4Id: ad2SeedId(runMarker, 'network', ENCODED_POWERSHELL_SCENARIO_KEY, 4),
  };
};
