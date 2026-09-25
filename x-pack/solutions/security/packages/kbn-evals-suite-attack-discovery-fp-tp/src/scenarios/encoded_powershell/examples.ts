/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  twinToWorld,
  withEntitiesFrom,
  withMissingCitedAlert,
  withoutAttackDiscovery,
  withoutEntities,
  withoutEvents,
  type FpTpWorld,
} from '../../world';
import type { FpTpExample } from '../types';
import { buildEncodedPowershellTwin } from './build_twins';

const tp = (runMarker: string): FpTpWorld =>
  twinToWorld(buildEncodedPowershellTwin('tp', runMarker));
const fp = (runMarker: string): FpTpWorld =>
  twinToWorld(buildEncodedPowershellTwin('fp', runMarker));

/**
 * The fp twin is U1 (an MDM script that looks like the attack); the tp twin is U6
 * (the attack is real). The remaining examples degrade a twin's evidence. Raw
 * events can still carry a true positive without the entity store, but missing
 * evidence never clears an alert, and entity role alone never escalates one.
 */
export const ENCODED_POWERSHELL_EXAMPLES: readonly FpTpExample[] = [
  {
    id: 'encoded-powershell.fp',
    situation: 'U1',
    evidenceState: 'complete',
    expectedOutcome: 'false_positive',
    provenance: 'authored',
    checks: {
      entityRole: 'contradicts',
      processParent: 'contradicts',
      networkDestination: 'contradicts',
    },
    buildWorld: fp,
  },
  {
    id: 'encoded-powershell.tp',
    situation: 'U6',
    evidenceState: 'complete',
    expectedOutcome: 'true_positive',
    provenance: 'authored',
    checks: { entityRole: 'supports', processParent: 'supports', networkDestination: 'supports' },
    buildWorld: tp,
  },
  {
    id: 'encoded-powershell.tp-entities-missing',
    situation: 'U6',
    evidenceState: 'entities_missing',
    expectedOutcome: 'true_positive',
    provenance: 'authored',
    checks: { entityRole: 'skipped', processParent: 'supports', networkDestination: 'supports' },
    buildWorld: (runMarker) => withoutEntities(tp(runMarker)),
  },
  {
    id: 'encoded-powershell.fp-entities-missing',
    situation: 'U1',
    evidenceState: 'entities_missing',
    expectedOutcome: 'inconclusive',
    provenance: 'authored',
    checks: {
      entityRole: 'skipped',
      processParent: 'contradicts',
      networkDestination: 'contradicts',
    },
    buildWorld: (runMarker) => withoutEntities(fp(runMarker)),
  },
  {
    id: 'encoded-powershell.tp-events-missing',
    situation: 'U6',
    evidenceState: 'events_missing',
    expectedOutcome: 'inconclusive',
    provenance: 'authored',
    checks: { entityRole: 'supports', processParent: 'skipped', networkDestination: 'skipped' },
    buildWorld: (runMarker) => withoutEvents(tp(runMarker)),
  },
  {
    id: 'encoded-powershell.mixed-world',
    situation: 'U1',
    evidenceState: 'mixed',
    expectedOutcome: 'inconclusive',
    provenance: 'authored',
    checks: {
      entityRole: 'contradicts',
      processParent: 'supports',
      networkDestination: 'supports',
    },
    buildWorld: (runMarker) => withEntitiesFrom(tp(runMarker), fp(runMarker)),
  },
  {
    id: 'encoded-powershell.failed-missing-ad',
    situation: 'U6',
    evidenceState: 'attack_discovery_missing',
    expectedOutcome: 'failed',
    provenance: 'authored',
    buildWorld: (runMarker) => withoutAttackDiscovery(tp(runMarker)),
  },
  {
    id: 'encoded-powershell.failed-missing-cited-alert',
    situation: 'U6',
    evidenceState: 'cited_alert_missing',
    expectedOutcome: 'failed',
    provenance: 'authored',
    buildWorld: (runMarker) => withMissingCitedAlert(tp(runMarker)),
  },
];
