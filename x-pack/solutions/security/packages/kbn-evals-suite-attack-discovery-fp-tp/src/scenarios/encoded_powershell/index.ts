/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FpTpScenario } from '../types';
import { buildEncodedPowershellTwin } from './build_twins';
import { ENCODED_POWERSHELL_EXAMPLES } from './examples';
import {
  ENCODED_POWERSHELL_ATTACK_ID,
  ENCODED_POWERSHELL_HOST,
  ENCODED_POWERSHELL_SCENARIO_KEY,
  ENCODED_POWERSHELL_USER,
} from './ids';

export const encodedPowershellScenario: FpTpScenario = {
  key: ENCODED_POWERSHELL_SCENARIO_KEY,
  sharedNames: [ENCODED_POWERSHELL_ATTACK_ID, ENCODED_POWERSHELL_HOST, ENCODED_POWERSHELL_USER],
  twins: {
    tp: (runMarker) => buildEncodedPowershellTwin('tp', runMarker),
    fp: (runMarker) => buildEncodedPowershellTwin('fp', runMarker),
  },
  examples: ENCODED_POWERSHELL_EXAMPLES,
};

export { buildEncodedPowershellAttack } from './attack';
export { buildEncodedPowershellEntities } from './entities';
export { buildEncodedPowershellTwin } from './build_twins';
export {
  ENCODED_POWERSHELL_ATTACK_ID,
  ENCODED_POWERSHELL_HOST,
  ENCODED_POWERSHELL_SCENARIO_KEY,
  ENCODED_POWERSHELL_USER,
  getEncodedPowershellIds,
} from './ids';
export type { EncodedPowershellVariant } from './ids';
