/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getChainIds,
  withoutAlertHostId,
  withoutEntities,
  withoutEventCategory,
  withoutEventIds,
  withoutEvents,
  withProcessParent,
  withStageEventSpan,
  withTruncatingBenignEvents,
} from '../../world';
import type { FpTpExample } from '../types';
import { MIMICRAT_CHAIN } from './chain';
import {
  fpWorld,
  INTUNE_AGENT_PARENT,
  tpWorld,
  withBenignActivity,
  withCradle,
  withManagementDestinations,
  withoutChainParents,
} from './worlds';

const TP_ID = 'mimicrat-clickfix.tp';

const FP_ID = 'mimicrat-clickfix.fp-benign-mimic';

const MANAGEMENT_CRADLE =
  'powershell.exe -w min -c "iex (irm \'https://manage.microsoft.com/ztd/update.ps1\')"';

const eventId = (runMarker: string, eventKey: string): string =>
  getChainIds(MIMICRAT_CHAIN, runMarker).eventId(eventKey);

/**
 * Two base worlds, the replayed chain (`tp`) and its benign mimic (`fp-benign-mimic`),
 * mutations that change facts the world checks read, and perturbations that change
 * none. Every gold follows from `checks` under the workflow's verdict rules.
 * `explorer.exe`, the Run dialog's parent, is the user's shell, so `processParent`
 * supports; a variant that needs it neutral removes the parent instead of guessing at
 * a neutral process.
 */
export const MIMICRAT_EXAMPLES: readonly FpTpExample[] = [
  {
    id: TP_ID,
    situation: 'U6',
    evidenceState: 'complete',
    expectedOutcome: 'true_positive',
    provenance: 'replay',
    checks: { entityRole: 'supports', processParent: 'supports', networkDestination: 'supports' },
    buildWorld: (runMarker) => tpWorld(runMarker),
  },
  {
    id: 'mimicrat-clickfix.tp-entities-missing',
    situation: 'U6',
    evidenceState: 'entities_missing',
    expectedOutcome: 'true_positive',
    provenance: 'replay',
    variant: {
      kind: 'mutation',
      of: TP_ID,
      description: 'entity records removed',
    },
    checks: { entityRole: 'skipped', processParent: 'supports', networkDestination: 'supports' },
    buildWorld: (runMarker) => withoutEntities(tpWorld(runMarker)),
  },
  {
    id: 'mimicrat-clickfix.tp-events-missing',
    situation: 'U6',
    evidenceState: 'events_missing',
    expectedOutcome: 'inconclusive',
    provenance: 'replay',
    variant: {
      kind: 'mutation',
      of: TP_ID,
      description: 'raw events removed',
    },
    checks: { entityRole: 'supports', processParent: 'skipped', networkDestination: 'skipped' },
    buildWorld: (runMarker) => withoutEvents(tpWorld(runMarker)),
  },
  {
    id: 'mimicrat-clickfix.drop-one-redundant',
    situation: 'U6',
    evidenceState: 'complete',
    expectedOutcome: 'true_positive',
    provenance: 'replay',
    variant: {
      kind: 'perturbation',
      of: TP_ID,
      description: 'exfil POST dropped; the check-in still shows the C2',
    },
    checks: { entityRole: 'supports', processParent: 'supports', networkDestination: 'supports' },
    buildWorld: (runMarker) =>
      withoutEventIds(tpWorld(runMarker), [eventId(runMarker, 'c2-exfil')]),
  },
  {
    id: 'mimicrat-clickfix.drop-one-sole-evidence',
    situation: 'U3',
    evidenceState: 'complete',
    expectedOutcome: 'true_positive',
    provenance: 'replay',
    variant: {
      kind: 'perturbation',
      of: TP_ID,
      description: "AMSI-bypass event, its stage's only evidence, dropped",
    },
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
    provenance: 'replay',
    variant: {
      kind: 'mutation',
      of: TP_ID,
      description: 'no parent recorded for either process',
    },
    checks: { entityRole: 'supports', processParent: 'neutral', networkDestination: 'supports' },
    buildWorld: (runMarker) => withoutChainParents(tpWorld(runMarker)),
  },
  {
    id: FP_ID,
    situation: 'U1',
    evidenceState: 'complete',
    expectedOutcome: 'false_positive',
    provenance: 'authored',
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
    provenance: 'authored',
    variant: {
      kind: 'mutation',
      of: FP_ID,
      description: 'no entity role and no parents',
    },
    checks: { entityRole: 'neutral', processParent: 'neutral', networkDestination: 'contradicts' },
    buildWorld: (runMarker) =>
      withManagementDestinations(
        withoutChainParents(withBenignActivity(tpWorld(runMarker, 'unknown'), runMarker))
      ),
  },
  {
    id: 'mimicrat-clickfix.fp-entities-missing',
    situation: 'U1',
    evidenceState: 'entities_missing',
    expectedOutcome: 'inconclusive',
    provenance: 'authored',
    variant: {
      kind: 'mutation',
      of: FP_ID,
      description: 'entity records removed',
    },
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
    provenance: 'authored',
    variant: {
      kind: 'mutation',
      of: FP_ID,
      description: 'raw events removed',
    },
    checks: { entityRole: 'contradicts', processParent: 'skipped', networkDestination: 'skipped' },
    buildWorld: (runMarker) => withoutEvents(fpWorld(runMarker)),
  },
  {
    id: 'mimicrat-clickfix.domain-swap',
    situation: 'U4',
    evidenceState: 'complete',
    expectedOutcome: 'inconclusive',
    provenance: 'replay',
    variant: {
      kind: 'mutation',
      of: TP_ID,
      description: 'stage-2 download and C2 moved to Microsoft management services',
    },
    checks: {
      entityRole: 'supports',
      processParent: 'supports',
      networkDestination: 'contradicts',
    },
    buildWorld: (runMarker) =>
      withManagementDestinations(withCradle(tpWorld(runMarker), runMarker, MANAGEMENT_CRADLE)),
  },
  {
    id: 'mimicrat-clickfix.role-swap-sccm',
    situation: 'U2',
    evidenceState: 'complete',
    expectedOutcome: 'inconclusive',
    provenance: 'replay',
    variant: {
      kind: 'mutation',
      of: TP_ID,
      description: 'host is an SCCM distribution point',
    },
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
    provenance: 'replay',
    variant: {
      kind: 'mutation',
      of: TP_ID,
      description: 'host is an Intune provisioning host',
    },
    checks: {
      entityRole: 'contradicts',
      processParent: 'supports',
      networkDestination: 'supports',
    },
    buildWorld: (runMarker) => tpWorld(runMarker, 'mdm_management'),
  },
  {
    id: 'mimicrat-clickfix.tp-host-name-only',
    situation: 'U6',
    evidenceState: 'complete',
    expectedOutcome: 'true_positive',
    provenance: 'replay',
    variant: {
      kind: 'perturbation',
      of: TP_ID,
      description: 'cited alerts carry host.name but no host.id',
    },
    checks: { entityRole: 'supports', processParent: 'supports', networkDestination: 'supports' },
    buildWorld: (runMarker) => withoutAlertHostId(tpWorld(runMarker)),
  },
  {
    id: 'mimicrat-clickfix.tp-multiday-span',
    situation: 'U6',
    evidenceState: 'complete',
    expectedOutcome: 'true_positive',
    provenance: 'replay',
    variant: {
      kind: 'perturbation',
      of: TP_ID,
      description: "cited-alert original_time and each stage's events spread across three days",
    },
    checks: { entityRole: 'supports', processParent: 'supports', networkDestination: 'supports' },
    buildWorld: (runMarker) => withStageEventSpan(tpWorld(runMarker), 3),
  },
  // The dilution measurement the #299995 review asked for, under the per-alert
  // window the follow-up adopted: the 3-day span widens the union of branch
  // windows to three days while each branch reads at most 10, oldest first.
  // More than a branch page of benign service starts sit inside the FIRST
  // cited alert's window (the fill lands just after the chain's first-stage
  // events, and only that first alert's window reaches back to them), so that
  // branch's own total (62) exceeds its 10-event cap and `branches_truncated`
  // flips, which blocks the clear — gold `inconclusive`, the same downgrade as
  // `encoded-powershell.fp-events-truncated` (per-branch truncation rather
  // than eviction off a single shared page). The first stage's own events are
  // the oldest in that window, so they still lead the branch's oldest-first
  // page and are KEPT; the gold rests on the truncation flag alone. The later
  // stages' alerts carry their own windows, so the analysis can still see
  // those events via their branches. With no such early-window volume every
  // deciding event fits (`tp-multiday-span`): a multi-day span alone does not
  // dilute; corpus volume inside a branch window does. No `checks`: the
  // verdict rules do not model truncation or eviction, so the gold would not
  // follow from them.
  {
    id: 'mimicrat-clickfix.fp-multiday-span-truncated',
    situation: 'U1',
    evidenceState: 'events_truncated',
    expectedOutcome: 'inconclusive',
    provenance: 'authored',
    buildWorld: (runMarker) =>
      withTruncatingBenignEvents(
        withStageEventSpan(fpWorld(runMarker), 3),
        runMarker,
        undefined,
        'afterFirstStage'
      ),
  },
  {
    id: 'mimicrat-clickfix.parent-spoof',
    situation: 'U1',
    evidenceState: 'complete',
    expectedOutcome: 'inconclusive',
    provenance: 'replay',
    variant: {
      kind: 'mutation',
      of: TP_ID,
      description: 'PowerShell started by the Intune management extension',
    },
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
    provenance: 'replay',
    variant: {
      kind: 'mutation',
      of: TP_ID,
      description: 'no entity role, no parents, no network events',
    },
    checks: { entityRole: 'neutral', processParent: 'neutral', networkDestination: 'neutral' },
    buildWorld: (runMarker) =>
      withoutEventCategory(withoutChainParents(tpWorld(runMarker, 'unknown')), 'network'),
  },
];
