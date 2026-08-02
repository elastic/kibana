/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getGateDefinitionByGateId } from '@kbn/pnd-common';
import type { PndConversation } from '@kbn/pnd-common';

import { THREAD_GATE_LABEL } from '../../translations';

/**
 * Names the HITL gate a thread is paired with, for the row's gate line — or `undefined` when
 * there is no gate to name.
 *
 * This is the only context a thread row has. The three alert-keyed conversations are titled by PND,
 * deterministically from the Attack Discovery title, but a thread's title comes from Agent Builder's
 * own titling of the seed message `_ensure` sent, and PND never renames a conversation to encode
 * kind or parentage (D9). Without the gate, two threads on the same Attack Discovery are two
 * identically-badged rows with unrelated titles.
 *
 * The label is looked up **through the gate registry** rather than derived from the `gateId`
 * string, which is what makes the three `undefined` cases fail closed rather than invent copy:
 *
 * - a conversation that is not a thread (the three alert-keyed kinds carry no `gateId` at all),
 * - a thread the server sent without a `gateId`,
 * - a `gateId` this browser's `PND_GATE_REGISTRY` does not have — only reachable from a server
 *   ahead of the browser, and a gate PND cannot even derive a thread id for.
 *
 * Parentage is deliberately **not** part of the description. It is re-derived on read and never
 * stored (D4), and both `container` gates fire *before* the container they name exists, so an
 * orphan thread is the normal case rather than an error worth surfacing on a row.
 */
export const describeThreadGate = ({ gateId, kind }: PndConversation): string | undefined => {
  if (kind !== 'thread' || gateId == null) {
    return undefined;
  }

  const gate = getGateDefinitionByGateId(gateId);

  return gate == null ? undefined : THREAD_GATE_LABEL[gate.gateId];
};
