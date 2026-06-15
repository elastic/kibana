/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import {
  CORRELATION_RUNS_API_PATH,
  CORRELATION_RUNS_MAX_CONCURRENT,
  THREAT_INTELLIGENCE_API_PRIVILEGES,
  DIAMOND_CONNECTOR_SETTING_KEY,
  TRIAGE_CONNECTOR_SETTING_KEY,
  SYNTHESIS_CONNECTOR_SETTING_KEY,
  TRIAGE_CONFIDENCE_FLOOR_SETTING_KEY,
  TRIAGE_TOP_N_SETTING_KEY,
} from '../../../../common/threat_intelligence/hub';
import { createCorrelationRunRequestSchema } from '../../../../common/threat_intelligence/correlation_runs';
import type { CorrelationRunResult } from '../../../../common/threat_intelligence/correlation_runs';
import { correlateThreat } from '../../services/correlate_threat';
import type { CorrelateThreatDepthResult } from '../../services/correlate_threat';
import { resolveScopedModel } from '../../routes/lib/scoped_model';
import { resolveCurrentSpaceId } from '../../lib/space_filter';
import { createRunIndexService } from '../run_index_service';
import { createRunDataClient } from '../run_data_client';
import type { RouteRegistrationDeps } from '../../routes';

const CORRELATE_MAX_BODY_BYTES = 10 * 1024 * 1024;

const INPUT_SUMMARY_MAX_LENGTH = 200;

/**
 * Maps a `CorrelateThreatDepthResult` (server-side typed) to the common
 * `CorrelationRunResult` shape for persistence.
 *
 * knn / triage intermediate results are cast via `unknown` because their
 * server-side types (AnchorHit, DiamondHit, TriagePick, TriageGroup) carry
 * specific interfaces that aren't index-signature compatible with the common
 * schema's Record shapes, but are fully JSON-serializable and runtime-valid.
 */
const toRunResult = (depthResult: CorrelateThreatDepthResult): CorrelationRunResult => {
  if (depthResult.depth === 'full') {
    return { depth: 'full', findings: depthResult.findings };
  }
  if (depthResult.depth === 'triage') {
    return {
      depth: 'triage',
      picks: depthResult.picks as unknown as Array<{
        candidate_id: string;
        confidence: number;
        justification: string;
      }>,
      groups: depthResult.groups as unknown as Array<{
        hypothesis: string;
        candidates: Array<{ candidate_id: string; confidence: number; justification: string }>;
      }>,
      triaged_out: depthResult.triaged_out as unknown as Array<{
        candidate_id: string;
        score: number;
        reason: string;
      }>,
      candidates_fed: depthResult.candidates_fed,
      fallback_used: depthResult.fallback_used,
      candidate_meta: depthResult.candidate_meta,
    };
  }
  if (depthResult.depth === 'knn') {
    return {
      depth: 'knn',
      anchor_hits: depthResult.anchor_hits.hits as unknown as Array<{
        report_id: string;
        title: string;
        match_breakdown: Record<string, unknown>;
      }>,
      diamond_hits: depthResult.diamond_hits.hits as unknown as Array<{
        report_id: string;
        title: string;
        overlap: number;
        score: number;
        vertex_scores: Record<string, number>;
      }>,
      merged: depthResult.merged as unknown as Array<{
        report_id: string;
        title: string;
        overlap: number;
        score: number;
        vertex_scores: Record<string, number>;
        match_breakdown?: Record<string, unknown>;
      }>,
      candidate_meta: depthResult.candidate_meta,
    };
  }
  // extract — QueryDiamondVertex matches extractDepthResultSchema's diamond shape
  return { depth: 'extract', diamond: depthResult.diamond };
};

export const registerCreateCorrelationRunRoute = ({
  router,
  logger,
  getSpacesService,
  getInference,
}: RouteRegistrationDeps): void => {
  router.versioned
    .post({
      path: CORRELATION_RUNS_API_PATH,
      access: 'public',
      security: {
        authz: {
          requiredPrivileges: [THREAT_INTELLIGENCE_API_PRIVILEGES.correlate],
        },
      },
      options: {
        body: {
          accepts: ['application/json'],
          maxBytes: CORRELATE_MAX_BODY_BYTES,
        },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: { body: buildRouteValidationWithZod(createCorrelationRunRequestSchema) },
        },
      },
      async (context, request, response) => {
        const {
          input_type: inputType,
          report_id: reportId,
          raw_text: rawText,
          depth,
        } = request.body;

        const core = await context.core;
        const spaceId = resolveCurrentSpaceId(getSpacesService(), request);
        const esClient = core.elasticsearch.client.asCurrentUser;
        const { client: uiSettingsClient } = core.uiSettings;
        const inference = getInference();

        // ---- Per-space concurrency cap ----
        const runDataClient = createRunDataClient({ esClient, logger, spaceId });
        const activeCount = await runDataClient.countActiveRuns();
        if (activeCount >= CORRELATION_RUNS_MAX_CONCURRENT) {
          return response.customError({
            statusCode: 429,
            body: {
              message:
                `Too many concurrent correlation runs (max ${CORRELATION_RUNS_MAX_CONCURRENT} per space). ` +
                'Wait for existing runs to complete.',
            },
          });
        }

        // ---- Resolve models eagerly (fail fast before returning 202) ----
        const readStr = async (key: string): Promise<string | undefined> => {
          try {
            const v = await uiSettingsClient.get<string>(key);
            return v || undefined;
          } catch {
            return undefined;
          }
        };
        const readNum = async (key: string, fallback: number): Promise<number> => {
          try {
            const v = await uiSettingsClient.get<number>(key);
            return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
          } catch {
            return fallback;
          }
        };

        const [
          diamondConnectorId,
          triageConnectorId,
          synthesisConnectorId,
          triageFloor,
          triageTopN,
        ] = await Promise.all([
          readStr(DIAMOND_CONNECTOR_SETTING_KEY),
          readStr(TRIAGE_CONNECTOR_SETTING_KEY),
          readStr(SYNTHESIS_CONNECTOR_SETTING_KEY),
          readNum(TRIAGE_CONFIDENCE_FLOOR_SETTING_KEY, 0.65),
          readNum(TRIAGE_TOP_N_SETTING_KEY, 75),
        ]);

        const extractionModelOutcome = await resolveScopedModel({
          inference,
          request,
          uiSettingsClient,
          connectorIdOverride: diamondConnectorId,
          logger,
        });

        if (!extractionModelOutcome.ok && inputType === 'raw_text') {
          return response.customError({
            statusCode: extractionModelOutcome.reason === 'no_inference_plugin' ? 503 : 400,
            body: { message: extractionModelOutcome.message },
          });
        }

        const triageModelOutcome = await resolveScopedModel({
          inference,
          request,
          uiSettingsClient,
          connectorIdOverride: triageConnectorId,
          logger,
        });

        if (!triageModelOutcome.ok) {
          return response.customError({
            statusCode: triageModelOutcome.reason === 'no_inference_plugin' ? 503 : 400,
            body: { message: `Triage model unavailable: ${triageModelOutcome.message}` },
          });
        }

        const synthesisModelOutcome = await resolveScopedModel({
          inference,
          request,
          uiSettingsClient,
          connectorIdOverride: synthesisConnectorId,
          logger,
        });

        if (!synthesisModelOutcome.ok) {
          return response.customError({
            statusCode: synthesisModelOutcome.reason === 'no_inference_plugin' ? 503 : 400,
            body: { message: `Synthesis model unavailable: ${synthesisModelOutcome.message}` },
          });
        }

        const extractionModel = extractionModelOutcome.ok
          ? extractionModelOutcome.model
          : undefined;
        const { model: triageModel } = triageModelOutcome;
        const { model: synthesisModel } = synthesisModelOutcome;

        // ---- Build run record ----
        const runId = uuidv4();
        const now = new Date().toISOString();

        const inputSummary =
          inputType === 'raw_text' && rawText
            ? rawText.slice(0, INPUT_SUMMARY_MAX_LENGTH)
            : reportId;

        const input =
          inputType === 'raw_text' && rawText
            ? ({ mode: 'raw_text', text: rawText } as const)
            : ({ mode: 'report_id', report_id: reportId as string } as const);

        // ---- Ensure index and persist initial record ----
        const runIndexService = createRunIndexService({ esClient, logger, spaceId });
        try {
          await runIndexService.ensureIndex();
          await runDataClient.createRun({
            runId,
            spaceId,
            createdBy: 'system',
            createdAt: now,
            updatedAt: now,
            input_type: inputType,
            report_id: inputType === 'report_id' ? reportId : undefined,
            input_summary: inputSummary,
            title: inputSummary,
            depth,
            status: 'pending',
          });
        } catch (e) {
          logger.error(`[CorrelationRuns] Failed to create run record '${runId}': ${e}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to create correlation run record' },
          });
        }

        // ---- Spawn background pipeline ----
        void (async () => {
          await runDataClient.updateRun(runId, {
            status: 'running',
            updatedAt: new Date().toISOString(),
          });

          try {
            const depthResult = await correlateThreat({
              esClient,
              extractionModel,
              triageModel,
              synthesisModel,
              logger,
              spaceId,
              input,
              triageFloor,
              triageTopN,
              depth,
              onStage: async (stage) => {
                await runDataClient.updateRun(runId, {
                  stage,
                  updatedAt: new Date().toISOString(),
                });
              },
            });

            const caseTitleUpdate =
              depthResult.depth === 'full' && depthResult.findings.synthesis.case_title
                ? depthResult.findings.synthesis.case_title
                : undefined;

            await runDataClient.updateRun(runId, {
              status: 'succeeded',
              stage: 'done',
              result: toRunResult(depthResult),
              ...(caseTitleUpdate !== undefined ? { title: caseTitleUpdate } : {}),
              updatedAt: new Date().toISOString(),
            });

            logger.info(
              `[CorrelationRuns] Background run succeeded (runId=${runId}, depth=${depth})`
            );
          } catch (pipelineError) {
            const errorMessage =
              pipelineError instanceof Error ? pipelineError.message : String(pipelineError);
            logger.error(
              `[CorrelationRuns] Background run failed (runId=${runId}): ${errorMessage}`
            );
            await runDataClient
              .updateRun(runId, {
                status: 'failed',
                error: errorMessage,
                updatedAt: new Date().toISOString(),
              })
              .catch((e: Error) =>
                logger.warn(
                  `[CorrelationRuns] Failed to persist error state (runId=${runId}): ${e.message}`
                )
              );
          }
        })();

        return response.ok({ body: { runId } });
      }
    );
};
