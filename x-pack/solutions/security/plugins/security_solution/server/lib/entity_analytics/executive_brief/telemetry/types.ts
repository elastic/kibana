/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VerificationCheck } from '../../../../../common/entity_analytics/executive_brief/brief';
import type {
  BriefErrorCode,
  BriefJobStage,
} from '../../../../../common/entity_analytics/executive_brief/document';
import type { SignalStatus } from '../../../../../common/entity_analytics/executive_brief/evidence';
import type { SignalOutcome } from '../signals/types';

export type BriefSpanName = 'generate' | BriefJobStage;

export type BriefRejectionReason =
  | 'in_flight_cap'
  | 'no_connector'
  | 'no_encryption_key'
  | 'licence'
  | 'no_stable_user';

/** One server event per finished job (EBT); no free text, entity names or prompts. */
export interface BriefCompletedEvent {
  outcome: 'succeeded' | 'failed';
  errorCode?: BriefErrorCode;
  range: string;
  model?: string;
  durationMs: number;
  stageDurationsMs: Partial<Record<BriefJobStage, number>>;
  signals: Array<{ id: string; status: SignalStatus; durationMs: number; factCount: number }>;
  entityCount: number;
  factCount: number;
  linkCount: number;
  tokens?: { prompt: number; completion: number };
  repaired: boolean;
  levelsLowered: number;
  verificationDropped: Partial<Record<VerificationCheck, number>>;
}

/**
 * Telemetry for the brief: OTel spans and metrics plus the EBT completion event. Pipeline and
 * engine code call this interface; `telemetry/brief_telemetry.ts` implements it.
 */
export interface BriefTelemetry {
  /** Runs `fn` inside a span; records the stage duration for stage spans. */
  withSpan<T>(
    name: BriefSpanName,
    attributes: Record<string, string | number | boolean>,
    fn: () => Promise<T>
  ): Promise<T>;
  /** Runs one signal inside a child span of `gather`. */
  withSignalSpan<T>(signalId: string, fn: () => Promise<T>): Promise<T>;
  recordSignal(outcome: SignalOutcome): void;
  recordTokens(tokens: { prompt: number; completion: number }): void;
  recordVerificationDropped(dropped: Partial<Record<VerificationCheck, number>>): void;
  recordRejected(reason: BriefRejectionReason): void;
  jobStarted(): void;
  /** Ends the active-job count, records generation duration, and reports the EBT event. */
  jobFinished(event: BriefCompletedEvent): void;
}

/** For tests and for callers built before telemetry is wired. */
export const noopBriefTelemetry: BriefTelemetry = {
  withSpan: (_name, _attributes, fn) => fn(),
  withSignalSpan: (_signalId, fn) => fn(),
  recordSignal: () => {},
  recordTokens: () => {},
  recordVerificationDropped: () => {},
  recordRejected: () => {},
  jobStarted: () => {},
  jobFinished: () => {},
};
