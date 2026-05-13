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

/**
 * Initial model version. The baseline `'1'` unlocks future schema migrations:
 * any subsequent attribute change must bump to `'2'` with explicit forward +
 * backward transformations. Without this, the type is pinned to legacy
 * migrations and cannot evolve safely.
 */
const modelVersions: SavedObjectsModelVersionMap = {
  '1': {
    changes: [],
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
    },
  },
  modelVersions,
};
