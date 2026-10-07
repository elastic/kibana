/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ENCODED_POWERSHELL_HOST_ENTITY_ID,
  ENCODED_POWERSHELL_NETWORK_2_ID,
  ENCODED_POWERSHELL_PROCESS_1_ID,
  ENCODED_POWERSHELL_USER_ENTITY_ID,
} from './constants';
import type { FpTpGold } from './types';

export const ENCODED_POWERSHELL_TP_GOLD: FpTpGold = {
  classification: 'true_positive',
  why: 'Process tree shows WINWORD spawning encoded PowerShell, C2 to malicious-c2.example.com, Run-key persistence, and SMB to ADMIN$.',
  mustRetrieve: ['entity_store', 'raw_events'],
  evidenceIds: {
    entity: [ENCODED_POWERSHELL_HOST_ENTITY_ID, ENCODED_POWERSHELL_USER_ENTITY_ID],
    event: [ENCODED_POWERSHELL_PROCESS_1_ID, ENCODED_POWERSHELL_NETWORK_2_ID],
  },
  mustNotCite: [],
};

export const ENCODED_POWERSHELL_FP_GOLD: FpTpGold = {
  classification: 'false_positive',
  why: 'Entity role and parent process show Intune/SCCM management activity, not an adversary. The network destination is Microsoft management infrastructure.',
  mustRetrieve: ['entity_store', 'raw_events'],
  evidenceIds: {
    entity: [ENCODED_POWERSHELL_HOST_ENTITY_ID],
    event: [ENCODED_POWERSHELL_PROCESS_1_ID, ENCODED_POWERSHELL_NETWORK_2_ID],
  },
  mustNotCite: [],
};
