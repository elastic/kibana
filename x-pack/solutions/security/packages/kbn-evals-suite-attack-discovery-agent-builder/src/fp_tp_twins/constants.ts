/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AD2_SCENARIO_ID_PREFIX } from '../scenario_registry';

/** Frozen clock so twin documents stay byte-stable across runs. */
export const FP_TP_BASE_TIME = new Date('2026-07-13T12:00:00.000Z');

export const FP_TP_TWIN_SEED_LABEL = 'ad-fp-tp-twins-2026-09';

export const FP_TP_ENTITY_INDEX = '.entities.v2.latest.default';

export const ENCODED_POWERSHELL_SCENARIO_KEY = 'encoded-powershell';

export const ENCODED_POWERSHELL_HOST = 'wks-alice-01';

export const ENCODED_POWERSHELL_USER = 'alice.chen';

export const ENCODED_POWERSHELL_HOST_ID = `${AD2_SCENARIO_ID_PREFIX}host-${ENCODED_POWERSHELL_HOST}`;

export const ENCODED_POWERSHELL_HOST_ENTITY_ID = `host:${ENCODED_POWERSHELL_HOST_ID}`;

export const ENCODED_POWERSHELL_USER_ENTITY_ID = `user:${ENCODED_POWERSHELL_USER}@${ENCODED_POWERSHELL_HOST_ID}@local`;

export const ENCODED_POWERSHELL_ATTACK_ID = 'ad-fp-tp-encoded-powershell-attack';

export const ENCODED_POWERSHELL_PROCESS_1_ID = `${AD2_SCENARIO_ID_PREFIX}${ENCODED_POWERSHELL_SCENARIO_KEY}-process-1`;

export const ENCODED_POWERSHELL_NETWORK_2_ID = `${AD2_SCENARIO_ID_PREFIX}${ENCODED_POWERSHELL_SCENARIO_KEY}-network-2`;

export const ENCODED_POWERSHELL_NETWORK_4_ID = `${AD2_SCENARIO_ID_PREFIX}${ENCODED_POWERSHELL_SCENARIO_KEY}-network-4`;
