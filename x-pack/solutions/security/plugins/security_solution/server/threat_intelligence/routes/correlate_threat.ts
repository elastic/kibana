/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import {
  CORRELATE_THREAT_API_PATH,
  THREAT_INTELLIGENCE_API_PRIVILEGES,
  DIAMOND_CONNECTOR_SETTING_KEY,
  TRIAGE_CONNECTOR_SETTING_KEY,
  SYNTHESIS_CONNECTOR_SETTING_KEY,
  TRIAGE_CONFIDENCE_FLOOR_SETTING_KEY,
  TRIAGE_TOP_N_SETTING_KEY,
} from '../../../common/threat_intelligence/hub';
import { correlateThreat } from '../services/correlate_threat';
import { resolveScopedModel } from './lib/scoped_model';
import { resolveCurrentSpaceId } from '../lib/space_filter';
import type { RouteRegistrationDeps } from '.';

// Matches extract_diamond — raw_text can be a full report body.
const CORRELATE_THREAT_MAX_BODY_BYTES = 10 * 1024 * 1024;

const correlateThreatBodySchema = schema.object(
  {
    raw_text: schema.maybe(schema.string({ minLength: 1 })),
    report_id: schema.maybe(schema.string({ minLength: 1 })),
    /** Phase 4 (fetch_source) — stub 400 for now. */
    url: schema.maybe(schema.string({ minLength: 1 })),
    /** Phase 5 (Cases integration) — stub 400 for now. */
    case_id: schema.maybe(schema.string({ minLength: 1 })),
  },
  {
    validate: (body) => {
      const provided = [body.raw_text, body.report_id, body.url, body.case_id].filter(Boolean);
      if (provided.length === 0) {
        return 'One of raw_text, report_id, url, or case_id is required';
      }
      if (provided.length > 1) {
        return 'Only one input mode may be specified per request';
      }
    },
  }
);

/**
 * Public route for the `correlate_threat` correlation pipeline.
 *
 * Gated on `.correlate` privilege — mirrors `search_by_anchors` registration.
 *
 * MVP input modes: `raw_text` and `report_id`.
 * Stubs: `url` (Phase 4) and `case_id` (Phase 5) return clean 400s.
 */
export const registerCorrelateThreatRoute = ({
  router,
  logger,
  getSpacesService,
  getInference,
}: RouteRegistrationDeps): void => {
  router.versioned
    .post({
      path: CORRELATE_THREAT_API_PATH,
      access: 'public',
      security: {
        authz: {
          requiredPrivileges: [THREAT_INTELLIGENCE_API_PRIVILEGES.correlate],
        },
      },
      options: {
        body: {
          accepts: ['application/json'],
          maxBytes: CORRELATE_THREAT_MAX_BODY_BYTES,
        },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: { request: { body: correlateThreatBodySchema } },
      },
      async (context, request, response) => {
        const { url, case_id: caseId, raw_text: rawText, report_id: reportId } = request.body;

        if (url) {
          return response.badRequest({
            body: { message: 'url input mode is not yet supported (Phase 4 — fetch_source)' },
          });
        }
        if (caseId) {
          return response.badRequest({
            body: { message: 'case_id input mode is not yet supported (Phase 5 — Cases)' },
          });
        }

        const core = await context.core;
        const spaceId = resolveCurrentSpaceId(getSpacesService(), request);
        const { client: uiSettingsClient } = core.uiSettings;

        // Read per-stage connector overrides from advanced settings.
        const readStringSetting = async (key: string): Promise<string | undefined> => {
          try {
            const v = await uiSettingsClient.get<string>(key);
            return v || undefined;
          } catch {
            return undefined;
          }
        };
        const readNumberSetting = async (key: string, fallback: number): Promise<number> => {
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
          readStringSetting(DIAMOND_CONNECTOR_SETTING_KEY),
          readStringSetting(TRIAGE_CONNECTOR_SETTING_KEY),
          readStringSetting(SYNTHESIS_CONNECTOR_SETTING_KEY),
          readNumberSetting(TRIAGE_CONFIDENCE_FLOOR_SETTING_KEY, 0.65),
          readNumberSetting(TRIAGE_TOP_N_SETTING_KEY, 75),
        ]);

        const inference = getInference();

        // Resolve the extraction model (diamond/raw_text). Required only for raw_text mode
        // but resolved eagerly so misconfigured deployments fail fast.
        const extractionModelOutcome = await resolveScopedModel({
          inference,
          request,
          uiSettingsClient,
          connectorIdOverride: diamondConnectorId,
          logger,
        });

        if (!extractionModelOutcome.ok && rawText) {
          return response.customError({
            statusCode: extractionModelOutcome.reason === 'no_inference_plugin' ? 503 : 400,
            body: { message: extractionModelOutcome.message },
          });
        }

        // Resolve the triage model (Sonnet-class, required for both input modes).
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

        // Resolve the synthesis model (Opus-tier, required for both input modes).
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

        try {
          const input = rawText
            ? ({ mode: 'raw_text', text: rawText } as const)
            : reportId
            ? ({ mode: 'report_id', report_id: reportId } as const)
            : null;

          if (!input) {
            // Schema validation guarantees one of the above is set — unreachable.
            return response.badRequest({ body: { message: 'No valid input mode resolved' } });
          }

          const depthResult = await correlateThreat({
            esClient: core.elasticsearch.client.asCurrentUser,
            extractionModel,
            triageModel,
            synthesisModel,
            logger,
            spaceId,
            input,
            triageFloor,
            triageTopN,
            depth: 'full',
          });

          if (depthResult.depth !== 'full') {
            return response.customError({
              statusCode: 500,
              body: { message: 'Internal error: unexpected depth result from correlateThreat' },
            });
          }

          return response.ok({ body: depthResult.findings });
        } catch (err) {
          logger.warn(`correlate_threat failed: ${(err as Error).message}`);
          return response.customError({
            statusCode: 500,
            body: { message: `Correlation failed: ${(err as Error).message}` },
          });
        }
      }
    );
};
