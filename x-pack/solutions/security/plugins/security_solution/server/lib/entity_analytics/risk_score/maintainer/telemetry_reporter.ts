/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup } from '@kbn/core/server';
import {
  RISK_SCORE_MAINTAINER_RUN_SUMMARY_EVENT,
  RISK_SCORE_MAINTAINER_STAGE_SUMMARY_EVENT,
} from '../../../telemetry/event_based/events';

const ERROR_MESSAGE_MAX_LENGTH = 500;

type MaintainerStatus = 'success' | 'error' | 'skipped' | 'aborted';
type GlobalSkipReason = 'feature_disabled' | 'license_insufficient';
type StageSkipReason = 'reset_to_zero_disabled' | 'lookup_empty' | 'resolution_disabled';
export type MaintainerErrorKind =
  | 'esql_query_failed'
  | 'bulk_write_failed'
  | 'entity_store_write_failed'
  | 'entity_fetch_failed'
  | 'unexpected';

export interface MaintainerRunContext {
  namespace: string;
  entityType: string;
  idBasedRiskScoringEnabled: boolean;
}

interface GlobalSkipInput {
  namespace: string;
  skipReason: GlobalSkipReason;
  idBasedRiskScoringEnabled: boolean;
}

export const createRiskScoreMaintainerTelemetryReporter = ({
  telemetry,
}: {
  telemetry: AnalyticsServiceSetup;
}) => {
  const reportEvent = (eventType: string, properties: Record<string, unknown>) => {
    telemetry?.reportEvent?.(eventType, properties);
  };

  let lastGlobalSkipReason: GlobalSkipReason | undefined;

  const forRun = (runContext: MaintainerRunContext) => {
    const runStartedAtMs = Date.now();
    const getRunDurationMs = () => Date.now() - runStartedAtMs;

    const reportStageSummary = ({
      stage,
      status,
      durationMs,
      skipReason,
      errorKind,
      pagesProcessed,
      scoresWritten,
      deferToPhase2Count,
      notInStoreCount,
      lookupDocsUpserted,
      lookupDocsDeleted,
      resetBatchLimitHit,
    }: {
      stage:
        | 'phase1_base_scoring'
        | 'phase1_lookup_sync'
        | 'phase2_resolution_scoring'
        | 'reset_to_zero';
      status: MaintainerStatus;
      durationMs: number;
      skipReason?: StageSkipReason;
      errorKind?: MaintainerErrorKind;
      pagesProcessed?: number;
      scoresWritten?: number;
      deferToPhase2Count?: number;
      notInStoreCount?: number;
      lookupDocsUpserted?: number;
      lookupDocsDeleted?: number;
      resetBatchLimitHit?: boolean;
    }) => {
      reportEvent(RISK_SCORE_MAINTAINER_STAGE_SUMMARY_EVENT.eventType, {
        namespace: runContext.namespace,
        entityType: runContext.entityType,
        stage,
        status,
        durationMs,
        skipReason,
        errorKind,
        pagesProcessed,
        scoresWritten,
        deferToPhase2Count,
        notInStoreCount,
        lookupDocsUpserted,
        lookupDocsDeleted,
        resetBatchLimitHit,
        idBasedRiskScoringEnabled: runContext.idBasedRiskScoringEnabled,
      });
    };

    const startBaseStage = () => {
      const stageStartedAtMs = Date.now();
      return {
        success: (input: {
          pagesProcessed: number;
          scoresWritten: number;
          deferToPhase2Count: number;
          notInStoreCount: number;
        }) =>
          reportStageSummary({
            stage: 'phase1_base_scoring',
            status: 'success',
            durationMs: Date.now() - stageStartedAtMs,
            pagesProcessed: input.pagesProcessed,
            scoresWritten: input.scoresWritten,
            deferToPhase2Count: input.deferToPhase2Count,
            notInStoreCount: input.notInStoreCount,
          }),
        error: (input: { errorKind: MaintainerErrorKind }) =>
          reportStageSummary({
            stage: 'phase1_base_scoring',
            status: 'error',
            durationMs: Date.now() - stageStartedAtMs,
            errorKind: input.errorKind,
          }),
      };
    };

    const startLookupSyncStage = () => {
      const stageStartedAtMs = Date.now();
      return {
        success: (input: { lookupDocsUpserted: number; lookupDocsDeleted: number }) =>
          reportStageSummary({
            stage: 'phase1_lookup_sync',
            status: 'success',
            durationMs: Date.now() - stageStartedAtMs,
            lookupDocsUpserted: input.lookupDocsUpserted,
            lookupDocsDeleted: input.lookupDocsDeleted,
          }),
        error: (input: { errorKind: MaintainerErrorKind }) =>
          reportStageSummary({
            stage: 'phase1_lookup_sync',
            status: 'error',
            durationMs: Date.now() - stageStartedAtMs,
            errorKind: input.errorKind,
          }),
      };
    };

    const startResolutionStage = () => {
      const stageStartedAtMs = Date.now();
      return {
        success: (input: { pagesProcessed: number; scoresWritten: number }) =>
          reportStageSummary({
            stage: 'phase2_resolution_scoring',
            status: 'success',
            durationMs: Date.now() - stageStartedAtMs,
            pagesProcessed: input.pagesProcessed,
            scoresWritten: input.scoresWritten,
          }),
        error: (input: { errorKind: MaintainerErrorKind }) =>
          reportStageSummary({
            stage: 'phase2_resolution_scoring',
            status: 'error',
            durationMs: Date.now() - stageStartedAtMs,
            errorKind: input.errorKind,
          }),
        skipped: (skipReason: Exclude<StageSkipReason, 'reset_to_zero_disabled'>) =>
          reportStageSummary({
            stage: 'phase2_resolution_scoring',
            status: 'skipped',
            durationMs: Date.now() - stageStartedAtMs,
            skipReason,
          }),
      };
    };

    const startResetStage = () => {
      const stageStartedAtMs = Date.now();
      return {
        success: (input: { scoresWritten: number; resetBatchLimitHit: boolean }) =>
          reportStageSummary({
            stage: 'reset_to_zero',
            status: 'success',
            durationMs: Date.now() - stageStartedAtMs,
            scoresWritten: input.scoresWritten,
            resetBatchLimitHit: input.resetBatchLimitHit,
          }),
        error: (input: { errorKind: MaintainerErrorKind }) =>
          reportStageSummary({
            stage: 'reset_to_zero',
            status: 'error',
            durationMs: Date.now() - stageStartedAtMs,
            errorKind: input.errorKind,
          }),
        skipped: () =>
          reportStageSummary({
            stage: 'reset_to_zero',
            status: 'skipped',
            durationMs: 0,
            skipReason: 'reset_to_zero_disabled',
          }),
      };
    };

    return {
      startBaseStage,
      startLookupSyncStage,
      startResolutionStage,
      startResetStage,
      errorSummary: (input: { errorKind: MaintainerErrorKind }) => {
        reportEvent(RISK_SCORE_MAINTAINER_RUN_SUMMARY_EVENT.eventType, {
          namespace: runContext.namespace,
          entityType: runContext.entityType,
          status: 'error',
          errorKind: input.errorKind,
          durationMs: getRunDurationMs(),
          scoresWrittenTotal: 0,
          scoresWrittenBase: 0,
          scoresWrittenResolution: 0,
          scoresWrittenResetToZero: 0,
          pagesProcessed: 0,
          deferToPhase2Count: 0,
          notInStoreCount: 0,
          lookupDocsUpserted: 0,
          lookupDocsDeleted: 0,
          lookupPrunedDocs: 0,
          idBasedRiskScoringEnabled: runContext.idBasedRiskScoringEnabled,
        });
      },
      completionSummary: (input: {
        runStatus: 'success' | 'error' | 'aborted';
        runErrorKind?: MaintainerErrorKind;
        scoresWrittenBase: number;
        scoresWrittenResolution: number;
        scoresWrittenResetToZero: number;
        pagesProcessed: number;
        deferToPhase2Count: number;
        notInStoreCount: number;
        lookupDocsUpserted: number;
        lookupDocsDeleted: number;
        lookupPrunedDocs: number;
      }) => {
        reportEvent(RISK_SCORE_MAINTAINER_RUN_SUMMARY_EVENT.eventType, {
          namespace: runContext.namespace,
          entityType: runContext.entityType,
          status: input.runStatus,
          errorKind: input.runErrorKind,
          durationMs: getRunDurationMs(),
          scoresWrittenTotal:
            input.scoresWrittenBase +
            input.scoresWrittenResolution +
            input.scoresWrittenResetToZero,
          scoresWrittenBase: input.scoresWrittenBase,
          scoresWrittenResolution: input.scoresWrittenResolution,
          scoresWrittenResetToZero: input.scoresWrittenResetToZero,
          pagesProcessed: input.pagesProcessed,
          deferToPhase2Count: input.deferToPhase2Count,
          notInStoreCount: input.notInStoreCount,
          lookupDocsUpserted: input.lookupDocsUpserted,
          lookupDocsDeleted: input.lookupDocsDeleted,
          lookupPrunedDocs: input.lookupPrunedDocs,
          idBasedRiskScoringEnabled: runContext.idBasedRiskScoringEnabled,
        });
      },
    };
  };

  return {
    reportGlobalSkipIfChanged: ({
      namespace,
      skipReason,
      idBasedRiskScoringEnabled,
    }: GlobalSkipInput) => {
      if (lastGlobalSkipReason === skipReason) {
        return;
      }

      reportEvent(RISK_SCORE_MAINTAINER_RUN_SUMMARY_EVENT.eventType, {
        namespace,
        entityType: 'all',
        status: 'skipped',
        skipReason,
        durationMs: 0,
        scoresWrittenTotal: 0,
        scoresWrittenBase: 0,
        scoresWrittenResolution: 0,
        scoresWrittenResetToZero: 0,
        pagesProcessed: 0,
        deferToPhase2Count: 0,
        notInStoreCount: 0,
        lookupDocsUpserted: 0,
        lookupDocsDeleted: 0,
        lookupPrunedDocs: 0,
        idBasedRiskScoringEnabled,
      });
      lastGlobalSkipReason = skipReason;
    },
    clearGlobalSkipReason: () => {
      lastGlobalSkipReason = undefined;
    },
    getErrorMessage: (error: unknown): string => {
      return getErrorMessage(error);
    },
    forRun,
  };
};

const getErrorMessage = (error: unknown): string => {
  const fallback = 'unknown_error';
  if (!error || typeof error !== 'object') {
    return fallback;
  }

  const message = 'message' in error ? String(error.message) : fallback;
  return message.substring(0, ERROR_MESSAGE_MAX_LENGTH);
};
