/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core/server';
import {
  SECURITY_SOLUTION_SAVED_OBJECT_INDEX,
  type SavedObjectsModelVersionMap,
} from '@kbn/core-saved-objects-server';
import { schema } from '@kbn/config-schema';

export const emulationReportTypeName = 'detection-emulation-report';

/**
 * Audit attribution persisted on every report. Mirrors `ActorContext`
 * from `execution/audit_context.ts` but is repeated here as a plain
 * interface to keep the SO type free of cross-package value imports.
 */
export interface EmulationReportActor {
  /** `'user'` for direct REST calls, `'agent-builder'` for tool dispatches. */
  kind: 'user' | 'agent-builder';
  /** Conversation that hosted the agent run. Agent-Builder only. */
  conversationId?: string;
  /** Per-invocation execution id from the agent runtime. Agent-Builder only. */
  executionId?: string;
  /** Top-level run id from the agent runtime. Agent-Builder only. */
  runId?: string;
  /** Per-tool-call id from the agent runtime. Agent-Builder only. */
  toolCallId?: string;
}

/** One dispatched response action recorded in the report. */
export interface EmulationReportDispatchedAction {
  actionId: string;
  command: string;
  status: 'dispatched' | 'error';
  error?: string;
}

/** Per-technique signal counts collected by the telemetry collector. */
export interface EmulationReportPhase {
  techniqueId: string;
  tp: number;
  fp: number;
  /** Rule names (or signal IDs) that fired for this technique. */
  signals: string[];
}

/** Confidence-scorer output stored on the report. */
export interface EmulationReportScore {
  confidence: number;
  coverage: number;
  precision: number;
  tp: number;
  fp: number;
}

/** Attributes stored in the detection-emulation-report saved object. */
export interface EmulationReportAttributes {
  /** sha256 of (ruleId + payloadIds + agentType) — deterministic run identifier. */
  scenarioId: string;
  /** Detection rule ID that was validated. */
  ruleId: string;
  /** sha256 over the scenario content — used for deduplication in history queries. */
  scenarioFingerprint: string;
  /** Dispatch mode for this run. */
  mode: 'real_execution' | 'log_injection';
  /** Endpoint agent IDs that were targeted. */
  endpointIds: string[];
  /** EDR agent type used for dispatch. */
  agentType: string;
  /** ISO 8601 timestamp when the emulation started. */
  startedAt: string;
  /** ISO 8601 timestamp when the emulation completed (absent while in-flight). */
  completedAt?: string;
  /** ATT&CK technique IDs covered by the chosen payloads. */
  payloadIds: string[];
  /** Response actions dispatched during the run. */
  dispatchedActions: EmulationReportDispatchedAction[];
  /** Confidence-scorer output. */
  score: EmulationReportScore;
  /** Per-technique telemetry breakdown. */
  perPhase: EmulationReportPhase[];
  /** Username of the operator who triggered the emulation. */
  operator: string;
  /** Kibana space the report belongs to. */
  spaceId: string;
  /**
   * Audit attribution describing WHO triggered the run.
   * Optional in the type signature because v1 documents were written
   * before this field existed; v2's `data_backfill` migration sets
   * `{ kind: 'user' }` on every legacy doc so reads after migration
   * are guaranteed to populate it.
   */
  actor?: EmulationReportActor;
}

const dispatchedActionSchema = schema.object({
  actionId: schema.string(),
  command: schema.string(),
  status: schema.oneOf([schema.literal('dispatched'), schema.literal('error')]),
  error: schema.maybe(schema.string()),
});

const phaseSchema = schema.object({
  techniqueId: schema.string(),
  tp: schema.number(),
  fp: schema.number(),
  signals: schema.arrayOf(schema.string()),
});

const scoreSchema = schema.object({
  confidence: schema.number(),
  coverage: schema.number(),
  precision: schema.number(),
  tp: schema.number(),
  fp: schema.number(),
});

const actorSchema = schema.object({
  kind: schema.oneOf([schema.literal('user'), schema.literal('agent-builder')]),
  conversationId: schema.maybe(schema.string()),
  executionId: schema.maybe(schema.string()),
  runId: schema.maybe(schema.string()),
  toolCallId: schema.maybe(schema.string()),
});

/**
 * Model version timeline:
 *
 *   v1 (baseline): every field except `actor`. The original schema
 *   shipped without audit attribution.
 *
 *   v2 (PROD-2): adds the optional `actor` field, mapped as a structured
 *   keyword group so auditors can query `actor.kind` and the per-tool-
 *   call IDs without scripting. Existing v1 documents are backfilled to
 *   `actor: { kind: 'user' }` because every pre-PROD-2 dispatch went
 *   through the REST surface (no tool path existed yet).
 */
const modelVersions: SavedObjectsModelVersionMap = {
  '1': {
    changes: [],
    schemas: {
      // forwardCompatibility runs when a v2-aware node reads a v1
      // document. `unknowns: 'ignore'` lets the new `actor` field pass
      // through without rejection so v1 readers don't blow up on the
      // additional v2 attribute.
      forwardCompatibility: schema.object(
        {
          scenarioId: schema.string(),
          ruleId: schema.string(),
          scenarioFingerprint: schema.string(),
          mode: schema.oneOf([schema.literal('real_execution'), schema.literal('log_injection')]),
          endpointIds: schema.arrayOf(schema.string()),
          agentType: schema.string(),
          startedAt: schema.string(),
          completedAt: schema.maybe(schema.string()),
          payloadIds: schema.arrayOf(schema.string()),
          dispatchedActions: schema.arrayOf(dispatchedActionSchema),
          score: scoreSchema,
          perPhase: schema.arrayOf(phaseSchema),
          operator: schema.string(),
          spaceId: schema.string(),
        },
        { unknowns: 'ignore' }
      ),
      create: schema.object({
        scenarioId: schema.string(),
        ruleId: schema.string(),
        scenarioFingerprint: schema.string(),
        mode: schema.oneOf([schema.literal('real_execution'), schema.literal('log_injection')]),
        endpointIds: schema.arrayOf(schema.string()),
        agentType: schema.string(),
        startedAt: schema.string(),
        completedAt: schema.maybe(schema.string()),
        payloadIds: schema.arrayOf(schema.string()),
        dispatchedActions: schema.arrayOf(dispatchedActionSchema),
        score: scoreSchema,
        perPhase: schema.arrayOf(phaseSchema),
        operator: schema.string(),
        spaceId: schema.string(),
      }),
    },
  },
  '2': {
    changes: [
      {
        type: 'mappings_addition',
        addedMappings: {
          actor: {
            // dynamic: false here mirrors the parent — we want to be
            // explicit about every queryable subfield so auditors can
            // index-time-filter on `actor.kind` without scripting.
            dynamic: false,
            properties: {
              kind: { type: 'keyword' },
              conversationId: { type: 'keyword' },
              executionId: { type: 'keyword' },
              runId: { type: 'keyword' },
              toolCallId: { type: 'keyword' },
            },
          },
        },
      },
      {
        // Why backfill to `kind: 'user'` and not leave it absent:
        // every v1 document was written via the REST route (the
        // Agent-Builder tool path didn't exist before PROD-2), so the
        // historical caller really IS a direct user. Auditors querying
        // `actor.kind:user` should see a clean union of legacy + v2
        // REST writes without having to special-case "missing actor".
        type: 'data_backfill',
        backfillFn: () => ({
          attributes: { actor: { kind: 'user' as const } },
        }),
      },
    ],
    schemas: {
      forwardCompatibility: schema.object(
        {
          scenarioId: schema.string(),
          ruleId: schema.string(),
          scenarioFingerprint: schema.string(),
          mode: schema.oneOf([schema.literal('real_execution'), schema.literal('log_injection')]),
          endpointIds: schema.arrayOf(schema.string()),
          agentType: schema.string(),
          startedAt: schema.string(),
          completedAt: schema.maybe(schema.string()),
          payloadIds: schema.arrayOf(schema.string()),
          dispatchedActions: schema.arrayOf(dispatchedActionSchema),
          score: scoreSchema,
          perPhase: schema.arrayOf(phaseSchema),
          operator: schema.string(),
          spaceId: schema.string(),
          actor: schema.maybe(actorSchema),
        },
        { unknowns: 'ignore' }
      ),
      create: schema.object({
        scenarioId: schema.string(),
        ruleId: schema.string(),
        scenarioFingerprint: schema.string(),
        mode: schema.oneOf([schema.literal('real_execution'), schema.literal('log_injection')]),
        endpointIds: schema.arrayOf(schema.string()),
        agentType: schema.string(),
        startedAt: schema.string(),
        completedAt: schema.maybe(schema.string()),
        payloadIds: schema.arrayOf(schema.string()),
        dispatchedActions: schema.arrayOf(dispatchedActionSchema),
        score: scoreSchema,
        perPhase: schema.arrayOf(phaseSchema),
        operator: schema.string(),
        spaceId: schema.string(),
        actor: schema.maybe(actorSchema),
      }),
    },
  },
};

export const emulationReportType: SavedObjectsType<EmulationReportAttributes> = {
  name: emulationReportTypeName,
  indexPattern: SECURITY_SOLUTION_SAVED_OBJECT_INDEX,
  // hidden + hiddenFromHttpApis removes the generic SO CRUD HTTP surface —
  // all access goes through the security_solution plugin's own routes.
  hidden: true,
  hiddenFromHttpApis: true,
  namespaceType: 'multiple-isolated',
  mappings: {
    dynamic: false,
    properties: {
      scenarioId: { type: 'keyword' },
      ruleId: { type: 'keyword' },
      scenarioFingerprint: { type: 'keyword' },
      mode: { type: 'keyword' },
      endpointIds: { type: 'keyword' },
      agentType: { type: 'keyword' },
      startedAt: { type: 'date' },
      completedAt: { type: 'date' },
      payloadIds: { type: 'keyword' },
      dispatchedActions: {
        dynamic: false,
        properties: {
          actionId: { type: 'keyword' },
          command: { type: 'keyword' },
          status: { type: 'keyword' },
          error: { type: 'keyword' },
        },
      },
      score: {
        properties: {
          confidence: { type: 'float' },
          coverage: { type: 'float' },
          precision: { type: 'float' },
          tp: { type: 'integer' },
          fp: { type: 'integer' },
        },
      },
      perPhase: {
        dynamic: false,
        properties: {
          techniqueId: { type: 'keyword' },
          tp: { type: 'integer' },
          fp: { type: 'integer' },
          signals: { type: 'keyword' },
        },
      },
      operator: { type: 'keyword' },
      spaceId: { type: 'keyword' },
      // PROD-2: matches the v2 `mappings_addition` so a fresh install
      // gets the field in its initial mapping; the migration path is
      // for upgrades from v1.
      actor: {
        dynamic: false,
        properties: {
          kind: { type: 'keyword' },
          conversationId: { type: 'keyword' },
          executionId: { type: 'keyword' },
          runId: { type: 'keyword' },
          toolCallId: { type: 'keyword' },
        },
      },
    },
  },
  modelVersions,
};
