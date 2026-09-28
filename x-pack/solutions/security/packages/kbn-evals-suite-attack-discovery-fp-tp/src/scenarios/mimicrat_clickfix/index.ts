/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  FP_TP_TWIN_SEED_LABEL,
  getChainIds,
  type FpTpGold,
  type FpTpTwin,
  type FpTpWorld,
} from '../../world';
import type { FpTpScenario } from '../types';
import {
  MIMICRAT_ATTACK_ID,
  MIMICRAT_CHAIN,
  MIMICRAT_HOST,
  MIMICRAT_SCENARIO_KEY,
  MIMICRAT_SOURCE_REF,
  MIMICRAT_USER,
} from './chain';
import { MIMICRAT_EXAMPLES } from './examples';
import { fpWorld, tpWorld } from './worlds';

const toTwin = (id: string, world: FpTpWorld, gold: FpTpGold): FpTpTwin => {
  if (!world.attack) {
    throw new Error(`Twin "${id}" has no Attack Discovery`);
  }
  const { alerts, events, entities, attack } = world;
  return { id, alerts, events, entities, attack, gold };
};

const buildTpTwin = (runMarker: string = FP_TP_TWIN_SEED_LABEL): FpTpTwin => {
  const { hostEntityId, userEntityId, eventId } = getChainIds(MIMICRAT_CHAIN, runMarker);
  return toTwin('mimicrat-clickfix.tp', tpWorld(runMarker), {
    classification: 'true_positive',
    why: 'An ordinary finance workstation ran a Run-dialog PowerShell cradle that fetched a stage from xMRi.network, and the dropped loader beaconed to d15mawx0xveem1.cloudfront.net.',
    mustRetrieve: ['entity_store', 'raw_events'],
    evidenceIds: {
      entity: [hostEntityId, userEntityId],
      event: [eventId('stage2-download'), eventId('c2-checkin')],
    },
    mustNotCite: [],
  });
};

const buildFpTwin = (runMarker: string = FP_TP_TWIN_SEED_LABEL): FpTpTwin => {
  const { hostEntityId, eventId } = getChainIds(MIMICRAT_CHAIN, runMarker);
  return toTwin('mimicrat-clickfix.fp-benign-mimic', fpWorld(runMarker), {
    classification: 'false_positive',
    why: 'The host is an SCCM distribution point, the Configuration Manager client started PowerShell, and every connection went to Microsoft management services.',
    mustRetrieve: ['entity_store', 'raw_events'],
    evidenceIds: {
      entity: [hostEntityId],
      event: [eventId('clickfix-powershell'), eventId('stage2-download')],
    },
    mustNotCite: [],
  });
};

export const mimicratClickfixScenario: FpTpScenario = {
  key: MIMICRAT_SCENARIO_KEY,
  sourceRef: MIMICRAT_SOURCE_REF,
  sharedNames: [MIMICRAT_ATTACK_ID, MIMICRAT_HOST, MIMICRAT_USER],
  twins: { tp: buildTpTwin, 'fp-benign-mimic': buildFpTwin },
  examples: MIMICRAT_EXAMPLES,
};
