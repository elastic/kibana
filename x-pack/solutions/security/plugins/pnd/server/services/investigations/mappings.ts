/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';

/**
 * Bump when any mapping in ./mappings.ts changes. On the next boot every PND
 * index whose `_meta.mappingsVersion` does not match is deleted and reseeded.
 *
 * Version 1 is the move off `dynamic: true`.
 */
export const MAPPINGS_VERSION = 1;

/**
 * Explicit mappings for the PND indices.
 *
 * These replace `dynamic: true`. Dynamic mapping made every string a `text`
 * field with a `.keyword` subfield, which meant:
 *
 *   - filters had to be written against `<field>.keyword` (see the
 *     `investigationId.keyword` term query this change removes),
 *   - the first document written decided the type of a field forever, so a
 *     `confidence` that happened to arrive as `1` mapped as `long` and then
 *     rejected `0.85`,
 *   - unmapped sort fields needed `unmapped_type` escape hatches,
 *   - and nothing stopped an unexpected field from silently expanding the
 *     mapping.
 *
 * Field types follow the shapes in `@kbn/pnd-common` (Investigation, Proposal,
 * Incident) and `server/common/schemas` (canonical Proposal, EvidencePackage,
 * WorkerEvaluationRecord, DetectionChangeSignal).
 *
 * Rules of thumb applied here:
 *   - ids, enums, and anything filtered/aggregated on -> `keyword`
 *   - human prose (titles, summaries, reasoning) -> `text`, plus a `keyword`
 *     subfield only where the UI also sorts or filters on the exact value
 *   - scores in 0..1 -> `float`; whole-number scores/counts -> `integer`
 *   - `events` -> `nested`, so "an event of type X by actor Y" stays a single
 *     matched event rather than a cross-product over the array
 *
 * `dynamic: 'strict'` is deliberately NOT used: worker output still carries
 * fields that have not been promoted into a schema yet. `dynamic: false` keeps
 * those in `_source` (so nothing is lost, and the UI can still render them)
 * while refusing to invent mappings for them.
 */

/** Timeline event, shared by all three templated record types. */
const eventsMapping = {
  type: 'nested' as const,
  properties: {
    id: { type: 'keyword' as const },
    timestamp: { type: 'date' as const },
    type: { type: 'keyword' as const },
    summary: { type: 'text' as const },
    actor: { type: 'keyword' as const },
  },
};

/** Rich evidence link rendered in the UI (Proposal.evidenceRefs). */
const evidenceRefMapping = {
  type: 'object' as const,
  properties: {
    id: { type: 'keyword' as const },
    type: { type: 'keyword' as const },
    label: { type: 'text' as const },
    url: { type: 'keyword' as const, index: false },
  },
};

/** Shared by every templated record: the template discriminator + its revision. */
const templateMapping = {
  template_id: { type: 'keyword' as const },
  template_version: { type: 'integer' as const },
};

export const investigationsMapping: MappingTypeMapping = {
  dynamic: false,
  properties: {
    ...templateMapping,
    id: { type: 'keyword' },
    title: { type: 'text' },
    createdAt: { type: 'date' },
    updatedAt: { type: 'date' },
    watch_id: { type: 'keyword' },
    watch_execution_id: { type: 'keyword' },
    watch_tier: { type: 'keyword' },
    severity: { type: 'keyword' },
    assignee: { type: 'keyword' },
    status: { type: 'keyword' },
    pendingProposalCount: { type: 'integer' },
    recommendedAction: { type: 'keyword' },
    affectedSurface: { type: 'keyword' },
    summary: { type: 'text' },
    // Queue ranking sorts on this; `integer` removes the `unmapped_type` hint.
    priorityScore: { type: 'integer' },
    recordId: { type: 'keyword' },
    primaryActionLabel: { type: 'text' },
    events: eventsMapping,

    // Written by recordEscalation() — Floor -> Dark -> Deep provenance chain.
    escalationLineage: {
      type: 'object',
      properties: {
        sourceWatch: { type: 'keyword' },
        escalatedToWatch: { type: 'keyword' },
        at: { type: 'date' },
      },
    },

    // Written by recordDetectionChangeSignal() — the Watch -> Detection Watch
    // seam. Nested so a gap's technique and confidence stay correlated.
    detectionChangeSignals: {
      type: 'nested',
      properties: {
        sourceWatch: { type: 'keyword' },
        runId: { type: 'keyword' },
        investigationId: { type: 'keyword' },
        gaps: {
          type: 'nested',
          properties: {
            technique: { type: 'keyword' },
            ruleRef: { type: 'keyword' },
            evidence: { type: 'text' },
            confidence: { type: 'float' },
          },
        },
      },
    },
  },
};

export const proposalsMapping: MappingTypeMapping = {
  dynamic: false,
  properties: {
    ...templateMapping,
    id: { type: 'keyword' },
    // Parent link. Previously queried as `investigationId.keyword` because
    // dynamic mapping made it a `text` field.
    parentConversationId: { type: 'keyword' },
    // Denormalised copy the store writes on seed so proposals can be found by
    // investigation without a join; stripped before the doc reaches the API.
    investigationId: { type: 'keyword' },
    type: { type: 'keyword' },
    confidence: { type: 'float' },
    reasoning: { type: 'text' },
    evidenceRefs: evidenceRefMapping,
    evidenceAgainst: evidenceRefMapping,
    status: { type: 'keyword' },
    assignee: { type: 'keyword' },
    sla: { type: 'date' },
    events: eventsMapping,
    sourceWatchId: { type: 'keyword' },
    approvalRequired: { type: 'boolean' },
    summary: { type: 'text' },
    recommendation: { type: 'text' },

    // Analyst decision fields written by updateProposalStatus().
    decidedAt: { type: 'date' },
    dismissalReason: { type: 'keyword' },
    rejectionReason: { type: 'text' },
    analystReasoning: { type: 'text' },
    caseRef: { type: 'keyword' },
  },
};

export const incidentsMapping: MappingTypeMapping = {
  dynamic: false,
  properties: {
    ...templateMapping,
    id: { type: 'keyword' },
    forkedFromInvestigationId: { type: 'keyword' },
    watch_id: { type: 'keyword' },
    status: { type: 'keyword' },
    severity: { type: 'keyword' },
    assignee: { type: 'keyword' },
    events: eventsMapping,
  },
};

/**
 * Canonical Daybreak Proposal contract. Separate index from the UI proposals:
 * here `evidenceRefs` is an array of evidence ids (strings), not link objects.
 */
export const canonicalProposalsMapping: MappingTypeMapping = {
  dynamic: false,
  properties: {
    id: { type: 'keyword' },
    schemaVersion: { type: 'keyword' },
    investigationId: { type: 'keyword' },
    sourceWatch: { type: 'keyword' },
    title: { type: 'text' },
    type: { type: 'keyword' },
    confidence: { type: 'float' },
    recommendation: { type: 'text' },
    reasoning: { type: 'text' },
    evidenceRefs: { type: 'keyword' },
    draft: { type: 'boolean' },
    approvalRequired: { type: 'boolean' },
    status: { type: 'keyword' },
    decidedAt: { type: 'date' },
    createdAt: { type: 'date' },

    // Rule-Tuning trigger — Detection Watch subscribes to this shape.
    ruleTuningTrigger: {
      type: 'object',
      properties: {
        reason: { type: 'keyword' },
        alertId: { type: 'keyword' },
        ruleRef: { type: 'keyword' },
        evidence: { type: 'text' },
      },
    },
  },
};

export const evidenceMapping: MappingTypeMapping = {
  dynamic: false,
  properties: {
    id: { type: 'keyword' },
    schemaVersion: { type: 'keyword' },
    kind: { type: 'keyword' },
    sourceRef: { type: 'keyword' },
    summary: { type: 'text' },
    provenance: { type: 'keyword' },
    confidence: { type: 'float' },
    stance: { type: 'keyword' },
    limitations: { type: 'text' },
    sensitivityLabel: { type: 'keyword' },
    createdAt: { type: 'date' },
    alertId: { type: 'keyword' },
    tactics: { type: 'keyword' },
  },
};

export const workerEvaluationsMapping: MappingTypeMapping = {
  dynamic: false,
  properties: {
    id: { type: 'keyword' },
    schemaVersion: { type: 'keyword' },
    workerId: { type: 'keyword' },
    watch: { type: 'keyword' },
    investigationId: { type: 'keyword' },
    runId: { type: 'keyword' },
    verdict: { type: 'keyword' },
    confidence: { type: 'float' },
    proposalId: { type: 'keyword' },
    evidenceRefs: { type: 'keyword' },
    createdAt: { type: 'date' },

    // Cost/latency attribution per worker run.
    provenance: {
      type: 'object',
      properties: {
        modelId: { type: 'keyword' },
        connectorId: { type: 'keyword' },
        latencyMs: { type: 'long' },
        inputTokens: { type: 'long' },
        outputTokens: { type: 'long' },
        totalTokens: { type: 'long' },
        costUsd: { type: 'float' },
        costBasis: { type: 'keyword' },
      },
    },
  },
};
