/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FP_TP_TWIN_SEED_LABEL, type FpTpGold } from '../../world';
import { getEncodedPowershellIds, type EncodedPowershellVariant } from './ids';

export const buildEncodedPowershellGold = (
  variant: EncodedPowershellVariant,
  runMarker: string = FP_TP_TWIN_SEED_LABEL
): FpTpGold => {
  const { hostEntityId, userEntityId, process1Id, network2Id } = getEncodedPowershellIds(runMarker);

  if (variant === 'tp') {
    return {
      classification: 'true_positive',
      why: 'Process tree shows WINWORD spawning encoded PowerShell, C2 to malicious-c2.example.com, Run-key persistence, and SMB to ADMIN$.',
      mustRetrieve: ['entity_store', 'raw_events'],
      evidenceIds: {
        entity: [hostEntityId, userEntityId],
        event: [process1Id, network2Id],
      },
      mustNotCite: [],
    };
  }

  return {
    classification: 'false_positive',
    why: 'Entity role and parent process show Intune/SCCM management activity, not an adversary. The network destination is Microsoft management infrastructure.',
    mustRetrieve: ['entity_store', 'raw_events'],
    evidenceIds: {
      entity: [hostEntityId],
      event: [process1Id, network2Id],
    },
    mustNotCite: [],
  };
};
