/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getChainIds,
  withNetworkDestination,
  withoutEntities,
  withoutEventCategory,
  withoutEventIds,
  withoutEvents,
  withProcessParent,
} from '../../world';
import type { FpTpExample } from '../types';
import { MIMICRAT_C2_DOMAIN, MIMICRAT_CHAIN } from './chain';
import {
  fpWorld,
  INTUNE_AGENT_PARENT,
  tpWorld,
  withManagementDestinations,
  withoutChainParents,
} from './worlds';

const eventId = (runMarker: string, eventKey: string): string =>
  getChainIds(MIMICRAT_CHAIN, runMarker).eventId(eventKey);

/**
 * The replayed chain (`tp`), its benign mimic (`fp-benign-mimic`), and variants that
 * each change one fact the world checks read. Every gold follows from `checks` under
 * the workflow's verdict rules. `explorer.exe`, the Run dialog's parent, is the user's
 * shell, so `processParent` supports; a variant that needs it neutral removes the
 * parent instead of guessing at a neutral process.
 */
export const MIMICRAT_EXAMPLES: readonly FpTpExample[] = [
  {
    id: 'mimicrat-clickfix.tp',
    situation: 'U6',
    evidenceState: 'complete',
    expectedOutcome: 'true_positive',
    labelProvenance: 'replay',
    checks: { entityRole: 'supports', processParent: 'supports', networkDestination: 'supports' },
    buildWorld: (runMarker) => tpWorld(runMarker),
  },
  {
    id: 'mimicrat-clickfix.tp-entities-missing',
    situation: 'U6',
    evidenceState: 'entities_missing',
    expectedOutcome: 'true_positive',
    labelProvenance: 'replay',
    checks: { entityRole: 'skipped', processParent: 'supports', networkDestination: 'supports' },
    buildWorld: (runMarker) => withoutEntities(tpWorld(runMarker)),
  },
  {
    id: 'mimicrat-clickfix.tp-events-missing',
    situation: 'U6',
    evidenceState: 'events_missing',
    expectedOutcome: 'inconclusive',
    labelProvenance: 'replay',
    checks: { entityRole: 'supports', processParent: 'skipped', networkDestination: 'skipped' },
    buildWorld: (runMarker) => withoutEvents(tpWorld(runMarker)),
  },
  {
    id: 'mimicrat-clickfix.drop-one-redundant',
    situation: 'U6',
    evidenceState: 'complete',
    expectedOutcome: 'true_positive',
    labelProvenance: 'adversarial-mutation',
    checks: { entityRole: 'supports', processParent: 'supports', networkDestination: 'supports' },
    buildWorld: (runMarker) =>
      withoutEventIds(tpWorld(runMarker), [eventId(runMarker, 'c2-exfil')]),
  },
  {
    id: 'mimicrat-clickfix.drop-one-sole-evidence',
    situation: 'U3',
    evidenceState: 'complete',
    expectedOutcome: 'true_positive',
    labelProvenance: 'adversarial-mutation',
    provisional: true,
    checks: { entityRole: 'supports', processParent: 'supports', networkDestination: 'supports' },
    buildWorld: (runMarker) =>
      withoutEventIds(tpWorld(runMarker), [eventId(runMarker, 'amsi-bypass')]),
  },
  {
    id: 'mimicrat-clickfix.tp-network-only',
    situation: 'U6',
    evidenceState: 'complete',
    expectedOutcome: 'true_positive',
    labelProvenance: 'adversarial-mutation',
    mutation: 'no parent recorded for either process',
    checks: { entityRole: 'supports', processParent: 'neutral', networkDestination: 'supports' },
    buildWorld: (runMarker) => withoutChainParents(tpWorld(runMarker)),
  },
  {
    id: 'mimicrat-clickfix.fp-benign-mimic',
    situation: 'U1',
    evidenceState: 'complete',
    expectedOutcome: 'false_positive',
    labelProvenance: 'adversarial-mutation',
    mutation: 'SCCM host, CcmExec parent, management destinations',
    checks: {
      entityRole: 'contradicts',
      processParent: 'contradicts',
      networkDestination: 'contradicts',
    },
    buildWorld: fpWorld,
  },
  {
    id: 'mimicrat-clickfix.fp-network-only',
    situation: 'U4',
    evidenceState: 'complete',
    expectedOutcome: 'false_positive',
    labelProvenance: 'adversarial-mutation',
    mutation: 'no entity role, no parents, management destinations',
    checks: { entityRole: 'neutral', processParent: 'neutral', networkDestination: 'contradicts' },
    buildWorld: (runMarker) =>
      withManagementDestinations(withoutChainParents(tpWorld(runMarker, 'unknown'))),
  },
  {
    id: 'mimicrat-clickfix.fp-entities-missing',
    situation: 'U1',
    evidenceState: 'entities_missing',
    expectedOutcome: 'inconclusive',
    labelProvenance: 'adversarial-mutation',
    mutation: 'benign mimic without entity records',
    checks: {
      entityRole: 'skipped',
      processParent: 'contradicts',
      networkDestination: 'contradicts',
    },
    buildWorld: (runMarker) => withoutEntities(fpWorld(runMarker)),
  },
  {
    id: 'mimicrat-clickfix.fp-events-missing',
    situation: 'U1',
    evidenceState: 'events_missing',
    expectedOutcome: 'inconclusive',
    labelProvenance: 'adversarial-mutation',
    mutation: 'benign mimic without raw events',
    checks: { entityRole: 'contradicts', processParent: 'skipped', networkDestination: 'skipped' },
    buildWorld: (runMarker) => withoutEvents(fpWorld(runMarker)),
  },
  {
    id: 'mimicrat-clickfix.domain-swap',
    situation: 'U4',
    evidenceState: 'complete',
    expectedOutcome: 'inconclusive',
    labelProvenance: 'adversarial-mutation',
    mutation: 'C2 hop moved to api.dropbox.com',
    checks: { entityRole: 'supports', processParent: 'supports', networkDestination: 'mixed' },
    buildWorld: (runMarker) =>
      withNetworkDestination(tpWorld(runMarker), MIMICRAT_C2_DOMAIN, {
        domain: 'api.dropbox.com',
        ip: '162.125.1.18',
        port: 443,
      }),
  },
  {
    id: 'mimicrat-clickfix.role-swap-sccm',
    situation: 'U2',
    evidenceState: 'complete',
    expectedOutcome: 'inconclusive',
    labelProvenance: 'adversarial-mutation',
    mutation: 'host is an SCCM distribution point',
    checks: {
      entityRole: 'contradicts',
      processParent: 'supports',
      networkDestination: 'supports',
    },
    buildWorld: (runMarker) => tpWorld(runMarker, 'sccm_distribution_point'),
  },
  {
    id: 'mimicrat-clickfix.role-swap-mdm',
    situation: 'U2',
    evidenceState: 'complete',
    expectedOutcome: 'inconclusive',
    labelProvenance: 'adversarial-mutation',
    mutation: 'host is an Intune provisioning host',
    checks: {
      entityRole: 'contradicts',
      processParent: 'supports',
      networkDestination: 'supports',
    },
    buildWorld: (runMarker) => tpWorld(runMarker, 'mdm_management'),
  },
  {
    id: 'mimicrat-clickfix.parent-spoof',
    situation: 'U1',
    evidenceState: 'complete',
    expectedOutcome: 'inconclusive',
    labelProvenance: 'adversarial-mutation',
    mutation: 'PowerShell started by the Intune management extension',
    checks: {
      entityRole: 'supports',
      processParent: 'contradicts',
      networkDestination: 'supports',
    },
    buildWorld: (runMarker) =>
      withProcessParent(tpWorld(runMarker), 'powershell.exe', INTUNE_AGENT_PARENT),
  },
  {
    id: 'mimicrat-clickfix.all-neutral',
    situation: 'U5',
    evidenceState: 'complete',
    expectedOutcome: 'inconclusive',
    labelProvenance: 'adversarial-mutation',
    mutation: 'no entity role, no parents, no network events',
    checks: { entityRole: 'neutral', processParent: 'neutral', networkDestination: 'neutral' },
    buildWorld: (runMarker) =>
      withoutEventCategory(withoutChainParents(tpWorld(runMarker, 'unknown')), 'network'),
  },
];
