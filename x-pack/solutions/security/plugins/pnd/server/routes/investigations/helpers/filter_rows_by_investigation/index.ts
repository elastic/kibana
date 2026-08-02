/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deriveConversationIds, type PndProposalRow } from '@kbn/pnd-common';

export interface FilterRowsByInvestigationParams {
  /** The `{id}` path param of `GET /internal/pnd/investigations/{id}/proposals`. */
  investigationId: string;
  rows: readonly PndProposalRow[];
}

/**
 * Keep the proposal rows belonging to one investigation.
 *
 * A parked gate carries no investigation id — the lane's *first* gate,
 * `await_open_investigation`, parks before any investigation exists, which is why the real queue is
 * a flat list and not a per-investigation one. What every gate does carry is the Attack Discovery
 * alert its run was correlated to, and on this branch that alert id is the durable key **every**
 * derived identity hangs off (epic decision 3): the Investigation, Incident and Tuning conversations
 * are all `uuidv5(correlationId, <namespace>)`. So an investigation and its proposals are
 * matched through that one key.
 *
 * Two forms of `investigationId` are accepted, and they are not two identity systems: the derived
 * Investigation **conversation id**, which is what a live `Investigation.id` is, and the Attack
 * Discovery **alert id** it is derived from, which is how PND's own surfaces address an incident.
 * UUIDv5 is one-way, so the match is made by re-deriving forwards from each row rather than by
 * inverting the id.
 *
 * **Fail-closed on an uncorrelated gate.** A row with a blank alert id belongs to no investigation,
 * so it is dropped rather than matched — including when the caller passes a blank id, which would
 * otherwise make every uncorrelated gate a member of every investigation. A `[Thread]` conversation
 * id never matches either: it addresses one proposal, not the investigation that contains it.
 */
export const filterRowsByInvestigation = ({
  investigationId,
  rows,
}: FilterRowsByInvestigationParams): PndProposalRow[] =>
  rows.filter(({ correlationId }) => {
    if (correlationId.trim() === '' || investigationId.trim() === '') {
      return false;
    }

    return (
      investigationId === correlationId ||
      investigationId === deriveConversationIds(correlationId).investigationConversationId
    );
  });
