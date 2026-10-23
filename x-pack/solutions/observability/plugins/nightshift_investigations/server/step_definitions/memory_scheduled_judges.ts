/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import type { Logger } from '@kbn/core/server';
import {
  DEFAULT_EVALUATOR_VERSION,
  NIGHTSHIFT_MEMORY_JUDGES_MONITOR_ID,
  NIGHTSHIFT_MEMORY_JUDGES_MONITOR_NAME,
  runScheduledMemoryJudges,
} from '../judges';
import { withTimeout } from './with_timeout';

const JUDGES_TIMEOUT_MS = 180_000;

export const memoryScheduledJudgesStepDefinition = ({
  logger,
  isEnabled,
}: {
  logger: Logger;
  isEnabled?: () => boolean;
}) =>
  createServerStepDefinition({
    id: 'nightshift.memoryScheduledJudges',
    label: 'Run Nightshift Scheduled Memory Judges',
    category: StepCategory.Ai,
    description:
      'Queries recent Nightshift T_background traces, subsamples unjudged rounds, and writes ' +
      'versioned read/write judge scores to .evaluation-online-scores.',
    inputSchema: z.object({
      window_minutes: z
        .number()
        .int()
        .min(1)
        .max(10_080)
        .optional()
        .describe('Sliding lookback window in minutes (default: 60).'),
      lag_minutes: z
        .number()
        .int()
        .min(0)
        .max(1_440)
        .optional()
        .describe('Lag buffer in minutes before sampling completed traces (default: 2).'),
      max_traces_per_run: z
        .number()
        .int()
        .min(1)
        .max(200)
        .optional()
        .describe('Maximum candidate T_background traces to evaluate per tick (default: 20).'),
      sample_rate: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe('Deterministic subsample rate in [0, 1] (default: 1.0).'),
      evaluator_version: z
        .string()
        .min(1)
        .max(64)
        .optional()
        .describe('Evaluator version stamped in .evaluation-online-scores (default: v1).'),
    }),
    outputSchema: z.object({
      status: z.literal('ok'),
      skipped: z.boolean().optional(),
      scanned_count: z.number(),
      sampled_count: z.number(),
      created_scores_count: z.number(),
      skipped_duplicate_count: z.number(),
      error_count: z.number(),
    }),
    handler: async (context) => {
      if (isEnabled && !isEnabled()) {
        context.logger.info('Skipped Nightshift scheduled memory judges (flag off)');
        return {
          output: {
            status: 'ok' as const,
            skipped: true,
            scanned_count: 0,
            sampled_count: 0,
            created_scores_count: 0,
            skipped_duplicate_count: 0,
            error_count: 0,
          },
        };
      }

      const { workflow } = context.contextManager.getContext();
      const summary = await withTimeout(
        (signal) =>
          runScheduledMemoryJudges({
            esClient: context.contextManager.getScopedEsClient(),
            spaceId: workflow.spaceId,
            windowMinutes: context.input.window_minutes ?? 60,
            lagMinutes: context.input.lag_minutes ?? 2,
            maxTracesPerRun: context.input.max_traces_per_run ?? 20,
            sampleRate: context.input.sample_rate ?? 1.0,
            evaluatorVersion: context.input.evaluator_version ?? DEFAULT_EVALUATOR_VERSION,
            monitorId: workflow.id || NIGHTSHIFT_MEMORY_JUDGES_MONITOR_ID,
            monitorName: NIGHTSHIFT_MEMORY_JUDGES_MONITOR_NAME,
            logger,
            signal,
          }),
        JUDGES_TIMEOUT_MS,
        `Nightshift scheduled memory judges timed out after ${JUDGES_TIMEOUT_MS}ms`,
        context.abortSignal
      );

      return {
        output: {
          status: 'ok' as const,
          scanned_count: summary.scannedCount,
          sampled_count: summary.sampledCount,
          created_scores_count: summary.createdScoresCount,
          skipped_duplicate_count: summary.skippedDuplicateCount,
          error_count: summary.errorCount,
        },
      };
    },
  });
