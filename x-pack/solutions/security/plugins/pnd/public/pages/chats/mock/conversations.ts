/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deriveConversationIds, deriveThreadConversationId } from '@kbn/pnd-common';
import type { PndConversation, PndGateId } from '@kbn/pnd-common';

/**
 * One conversation of each of the three **alert-keyed** kinds the loop produces, derived
 * from the same Attack Discovery — which is what `GET /internal/pnd/conversations`
 * returns for a run that reached Phase 4 without any gate having parked.
 *
 * Deliberately out of chronological order, so a test that asserts sorting cannot
 * pass on the fixture's own ordering.
 *
 * The investigation and the tuning conversation carry the **same title**, and that is the point:
 * both are keyed on `ad-alert-1`, the watch titles all three from the Attack Discovery title alone
 * (kibana-phf4.16 retired the `[Investigation]` / `[Incident]` / `[Tuning]` prefixes), and the kind
 * badge is re-derived from the namespace. A fixture with three distinct titles would let a surface
 * that leans on the title to tell kinds apart pass here and fail in a real space.
 *
 * The gate-keyed `thread` kind is a **separate** fixture ({@link mockThreadConversations})
 * rather than three more entries here, and combining the two is
 * {@link mockConversationsWithThreads}. Folding threads into this array would have
 * silently changed what half a dozen existing assertions mean — several pin an exact
 * id list for a query, and one pins this array's length — while "a run with no parked
 * gate" is itself a real state worth keeping a fixture for.
 */
export const mockConversations: PndConversation[] = [
  {
    correlationId: 'ad-alert-1',
    createdAt: '2026-08-03T17:14:00.000Z',
    id: '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
    kind: 'investigation',
    title: 'Suspicious PowerShell on host-1',
    updatedAt: '2026-08-03T17:31:00.000Z',
  },
  {
    correlationId: 'ad-alert-1',
    createdAt: '2026-08-03T18:02:00.000Z',
    id: '3f2504e0-4f89-11d3-9a0c-0305e82c3303',
    kind: 'tuning',
    title: 'Suspicious PowerShell on host-1',
    updatedAt: '2026-08-03T18:44:00.000Z',
  },
  {
    correlationId: 'ad-alert-2',
    createdAt: '2026-08-03T17:48:00.000Z',
    id: '3f2504e0-4f89-11d3-9a0c-0305e82c3302',
    kind: 'incident',
    title: 'Credential dumping on host-2',
    updatedAt: '2026-08-03T17:59:00.000Z',
  },
];

/** The Attack Discovery alert every thread fixture is keyed on, alongside its gate. */
export const THREAD_FIXTURE_ATTACK_DISCOVERY_ALERT_ID = 'ad-alert-1';

interface ThreadConversationSeed {
  createdAt: string;
  gateId: PndGateId;
  title: string;
  updatedAt: string;
}

/**
 * Thread titles are **not** deterministic, and that is the whole reason a thread row shows
 * its gate.
 *
 * The three alert-keyed conversations are titled by PND, deterministically from the Attack
 * Discovery title, but a thread's title is whatever Agent Builder derived from the seed message
 * `_ensure` sent, and PND never renames a conversation to encode kind or parentage (D9). So
 * these read like agent-written titles rather than like a PND convention — a fixture that
 * cheated with a `[Thread] …` prefix would make the gate line look redundant.
 *
 * One thread per registered gate, all on the same alert, so every `gateId` the contract can
 * carry is represented — including `apply_tuning`, the one gate whose `parentKind` and
 * `threadAgentKind` diverge. Timestamps are out of order, and all of them older than the
 * newest entry in {@link mockConversations}, so combining the two arrays leaves the
 * "most recently updated" row unchanged.
 */
const THREAD_CONVERSATION_SEEDS: readonly ThreadConversationSeed[] = [
  {
    createdAt: '2026-08-03T17:52:00.000Z',
    gateId: 'apply_tuning',
    title: 'Should the rule ignore signed installers?',
    updatedAt: '2026-08-03T18:30:00.000Z',
  },
  {
    createdAt: '2026-08-03T17:05:00.000Z',
    gateId: 'open_investigation',
    title: 'Is this worth a full investigation?',
    updatedAt: '2026-08-03T17:20:00.000Z',
  },
  {
    createdAt: '2026-08-03T17:41:00.000Z',
    gateId: 'incident_contained',
    title: 'Has the staging directory stopped being written to?',
    updatedAt: '2026-08-03T18:11:00.000Z',
  },
  {
    createdAt: '2026-08-03T17:33:00.000Z',
    gateId: 'promote_incident',
    title: 'Does host-1 belong to the same intrusion as host-2?',
    updatedAt: '2026-08-03T17:37:00.000Z',
  },
];

/**
 * One `thread` conversation per registered HITL gate, all derived from
 * {@link THREAD_FIXTURE_ATTACK_DISCOVERY_ALERT_ID}.
 *
 * Ids come from `deriveThreadConversationId` rather than from literals, so a fixture can
 * never claim an id the real `(correlationId, gateId)` derivation would not produce.
 * `flatMap` keeps that honest without a non-null assertion: the derivation fails closed on a
 * blank alert id or an unregistered gate, and neither is possible here, so a fixture that
 * came back empty is a regression the thread suites will report as a missing count rather
 * than as an id mismatch.
 */
export const mockThreadConversations: PndConversation[] = THREAD_CONVERSATION_SEEDS.flatMap(
  ({ createdAt, gateId, title, updatedAt }) => {
    const id = deriveThreadConversationId({
      correlationId: THREAD_FIXTURE_ATTACK_DISCOVERY_ALERT_ID,
      gateId,
    });

    return id == null
      ? []
      : [
          {
            correlationId: THREAD_FIXTURE_ATTACK_DISCOVERY_ALERT_ID,
            createdAt,
            gateId,
            id,
            kind: 'thread' as const,
            title,
            updatedAt,
          },
        ];
  }
);

/**
 * Every kind at once — the three alert-keyed conversations plus one thread per gate — which is
 * what the projection returns once a run has parked its gates and `_ensure` has materialised
 * their threads.
 */
export const mockConversationsWithThreads: PndConversation[] = [
  ...mockConversations,
  ...mockThreadConversations,
];

/**
 * One Attack Discovery with an investigation, an incident, tuning, and both
 * parentKinds of thread — the shape the chat page nests. Ids are derived so
 * `parentOf` / `originatingInvestigation` recover the same links the route does.
 */
const NESTED_ALERT_ID = 'ad-nested-chats';
const nestedIds = deriveConversationIds(NESTED_ALERT_ID);

const nestedThread = (gateId: PndGateId, title: string): PndConversation => {
  const id = deriveThreadConversationId({
    correlationId: NESTED_ALERT_ID,
    gateId,
  });

  if (id == null) {
    throw new Error(`no thread id for ${gateId}`);
  }

  return {
    correlationId: NESTED_ALERT_ID,
    createdAt: '2026-08-03T17:00:00.000Z',
    gateId,
    id,
    kind: 'thread',
    title,
    updatedAt: '2026-08-03T17:00:00.000Z',
  };
};

export const mockNestedInvestigation: PndConversation = {
  correlationId: NESTED_ALERT_ID,
  createdAt: '2026-08-03T16:00:00.000Z',
  id: nestedIds.investigationConversationId,
  kind: 'investigation',
  title: 'Suspicious PowerShell on host-1',
  updatedAt: '2026-08-03T16:30:00.000Z',
};

export const mockNestedIncident: PndConversation = {
  correlationId: NESTED_ALERT_ID,
  createdAt: '2026-08-03T17:00:00.000Z',
  id: nestedIds.incidentConversationId,
  kind: 'incident',
  title: 'Credential dumping on host-1',
  updatedAt: '2026-08-03T17:30:00.000Z',
};

export const mockNestedTuning: PndConversation = {
  correlationId: NESTED_ALERT_ID,
  createdAt: '2026-08-03T18:00:00.000Z',
  id: nestedIds.tuningConversationId,
  kind: 'tuning',
  title: 'Suspicious PowerShell on host-1',
  updatedAt: '2026-08-03T18:30:00.000Z',
};

export const mockNestedOpenInvestigationThread = nestedThread(
  'open_investigation',
  'Is this worth a full investigation?'
);

export const mockNestedContainThread = nestedThread(
  'incident_contained',
  'Has the staging directory stopped being written to?'
);

export const mockNestedConversations: PndConversation[] = [
  mockNestedInvestigation,
  mockNestedIncident,
  mockNestedTuning,
  mockNestedOpenInvestigationThread,
  mockNestedContainThread,
];
