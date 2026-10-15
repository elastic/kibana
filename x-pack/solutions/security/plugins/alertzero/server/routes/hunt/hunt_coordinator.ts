/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { AttachmentPublicClient } from '@kbn/agent-builder-server';
import type { HuntCoordinatorResponse, HuntCoordinatorResult } from '@kbn/alertzero-common';
import {
  API_VERSIONS,
  HuntCoordinatorRequestBody,
  INTERNAL_API_ACCESS,
} from '@kbn/alertzero-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { randomUUID } from 'crypto';
import {
  ALERTZERO_API_PRIVILEGE_WRITE,
  HUNT_INTERNAL_ROUTE_BASE,
  buildHuntCoordinatorResultAttachmentId,
} from '../../../common/constants';
import type { HuntCoordinatorResultAttachment } from '../../../common/hunt_coordinator_result_attachment_schema';
import { InvalidHuntWindowError } from '../../services/watches/hunt/common/assert_hunt_window';
import type {
  HuntCoordinatorClients,
  HuntCoordinatorParams,
} from '../../services/watches/hunt/hunt_coordinator';
import { huntCoordinator } from '../../services/watches/hunt/hunt_coordinator';
import type { HuntModels } from '../../services/watches/hunt/types';
import { buildSseData } from '../../services/watches/hunt/common/sse_mapper';
import { buildImpactEntities } from '../../services/watches/hunt/common/build_impact_entities';
import { resolveHuntModels } from './lib/hunt_models';
import { writeRunning, writeTerminal } from './lib/hunt_coordinator_result_store';
import { resolveHuntUniverse } from './resolve_hunt_universe';
import { withAlertZeroEnabled } from '../with_alertzero_enabled';
import type { RouteDependencies } from '../register_routes';

export const HUNT_COORDINATOR_URL = `${HUNT_INTERNAL_ROUTE_BASE}/hunt_coordinator` as const;

/**
 * The one message a failed run shows the hunt child. The child's `reason` ends up in the
 * Investigation through the Worker's run conclusion, where every later agent round reads it
 * as user input, so the real error goes to the server log only.
 */
const FAILED_MESSAGE = 'Hunt coordinator failed';

type TerminalEnvelope = Extract<HuntCoordinatorResultAttachment, { state: 'completed' | 'failed' }>;

/**
 * The Tier 1 + Tier 2 pipeline, detached from the request that started it. Everything it
 * needs was resolved before the route answered; the only thing it writes is the hidden
 * result attachment. SSE, impact, the results message and the evidence stamp stay with the
 * hunt child, which runs them off the polled result, so a run the child gave up waiting on
 * leaves nothing analyst-visible behind.
 */
const runHuntCoordinatorJob = async ({
  clients,
  models,
  logger,
  params,
  attachmentsClient,
  conversationId,
  attachmentId,
}: {
  clients: HuntCoordinatorClients;
  models: HuntModels;
  logger: Logger;
  params: HuntCoordinatorParams;
  attachmentsClient: AttachmentPublicClient;
  conversationId: string;
  attachmentId: string;
}): Promise<void> => {
  const { run_id: runId, report_id: reportId, spaceId } = params;
  const logMeta = (state: TerminalEnvelope['state']) =>
    `run_id=${runId} report_id=${reportId ?? '-'} space_id=${spaceId} state=${state}`;

  let envelope: TerminalEnvelope;
  try {
    const result = await huntCoordinator(clients, models, logger, params);

    // SSE entries ride the result only on a confirmed hit for a named report; the hunt
    // child fans out over them with ai.attachment.add. Use the coordinator OR (Tier 1 ||
    // Tier 2), not Tier 1 alone. The impact entities come from those same entries, so a
    // run attaches impact only for what it confirmed.
    let body: HuntCoordinatorResult = result;
    if (result.has_confirmed_hit && reportId) {
      const sse = buildSseData(result, reportId, { spaceId });
      body = { ...result, sse, impacted_entities: buildImpactEntities(sse) };
    }
    envelope = {
      run_id: runId,
      ...(reportId ? { report_id: reportId } : {}),
      state: 'completed',
      result: body,
    };
  } catch (err) {
    // The hunt window check runs inside Tier 1, so a bad window surfaces here rather than as
    // a request error. Its message names the caller's own input and is safe to show; every
    // other failure gets the fixed message.
    const message = err instanceof InvalidHuntWindowError ? err.message : FAILED_MESSAGE;
    logger.error(
      `hunt_coordinator: pipeline failed (${logMeta('failed')}): ${(err as Error).message}`
    );
    envelope = {
      run_id: runId,
      ...(reportId ? { report_id: reportId } : {}),
      state: 'failed',
      error: { message },
    };
  }

  try {
    await writeTerminal({ client: attachmentsClient, conversationId, attachmentId, envelope });
    if (envelope.state === 'completed') {
      logger.info(`hunt_coordinator: result written (${logMeta('completed')})`);
    }
  } catch (err) {
    // Nothing else can report this: the hunt child polls until its limit and reports the run
    // as not finished, which is the honest outcome when the result cannot be stored.
    logger.error(
      `hunt_coordinator: could not write the result attachment ${attachmentId} (${logMeta(
        envelope.state
      )}): ${(err as Error).message}`
    );
  }
};

/**
 * Starts the two-tier hunt pipeline (Tier 1 + optional Tier 2) for a single report and
 * answers at once with where the result will land.
 *
 * The full run can take minutes, longer than Cloud's edge or Kibana's own socket timeout
 * keeps one HTTP call open, so this route never holds the call for it. It creates a hidden
 * `running` attachment on the report's Investigation, detaches the pipeline, and returns
 * `{ run_id, state: 'running', result_attachment_id }`. The pipeline updates that attachment
 * to `{ state: 'completed', result }` or `{ state: 'failed', error }`; the hunt child polls
 * it by the returned id, consumes `result`, and deletes it.
 *
 * Everything the pipeline needs (clients, models, index patterns, the attachment client) is
 * resolved before the response is sent. The placeholder is written synchronously so a
 * conversation that cannot be written, a missing Agent Builder, or a missing permission fails
 * the request instead of leaving the child polling for nothing. Every pre-detach failure is a
 * 500 with the same generic message.
 *
 * The coordinator does NOT write feedback: `completed_successfully` on the result tells the
 * hunt child whether its evidence step should proceed. A blocked scope is a `completed`
 * envelope whose result has `status: 'blocked'`, deliberately differing from the standalone
 * `hunt_for_threat` route's 409: this route chains Tier 1 into Tier 2, so a caller already
 * reads the status field either way. See elastic/security-team#19741.
 */
export const registerHuntCoordinatorRoute = ({
  router,
  logger,
  getSpaceId,
  getHuntServices,
  getAgentBuilderAttachments,
}: RouteDependencies): void => {
  router.versioned
    .post({
      path: HUNT_COORDINATOR_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: {
          // Tier 2 spends LLM tokens and can execute LLM-generated ES|QL as the caller.
          requiredPrivileges: [ALERTZERO_API_PRIVILEGE_WRITE],
        },
      },
      summary: 'Start the two-tier hunt coordinator for a report',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            body: buildRouteValidationWithZod(HuntCoordinatorRequestBody),
          },
        },
      },
      withAlertZeroEnabled(async (context, request, response) => {
        try {
          const core = await context.core;
          const spaceId = getSpaceId(request);
          // Telemetry, alerts, and ES|QL run as the calling user so their index
          // privileges apply. The reports index is plugin-owned and hidden, and Kibana
          // feature privileges grant no Elasticsearch privileges on it, so it is read
          // with the internal user and scoped by the explicit space filter.
          const esClient = core.elasticsearch.client.asCurrentUser;
          const reportsEsClient = core.elasticsearch.client.asInternalUser;
          const { getInference, getSearchInferenceEndpoints, mitreDataClient } = getHuntServices();

          const indexPatterns = await resolveHuntUniverse(context, logger);

          const {
            conversation_id: conversationId,
            report_id,
            text,
            iocs,
            techniques,
            time_range,
            size,
            max_assets,
            llm_confidence_threshold,
            tier2_when,
            max_tier2_sample_events,
            trigger,
            run_id,
          } = request.body;

          // One model per tier, resolved independently: a tier with no usable endpoint is
          // absent from `models` and only its consumers degrade (see `HuntModels`). A missing
          // connector is the ordinary outcome, not an error, so it never fails the request.
          // They are resolved regardless of `tier2_when`, since resolving a connector spends
          // no tokens. Tier 2 itself is still gated on `tier2_when` inside the coordinator,
          // so a `never` run stays `never`.
          const { models, failures } = await resolveHuntModels({
            inference: getInference(),
            searchInferenceEndpoints: getSearchInferenceEndpoints(),
            request,
            uiSettingsClient: core.uiSettings.client,
            logger,
          });
          for (const failure of failures) {
            // A missing connector is the ordinary outcome, but a resolution that threw is a
            // fault, and at debug it would be invisible in production.
            const log =
              failure.reason === 'resolution_error'
                ? logger.warn.bind(logger)
                : logger.debug.bind(logger);
            log(
              `hunt_coordinator: ${failure.tier} model unavailable, its consumers will degrade — ${failure.message}`
            );
          }

          // The Worker fan-out supplies a run id so one sweep's children share it,
          // which is what the packaging barrier and conclusion dedupe key off. Only
          // mint one when the caller has no sweep to tie the run to. The result
          // attachment id carries it so a rerun on the same Investigation never reads
          // an earlier sweep's result.
          const runId = run_id ?? randomUUID();
          const attachmentId = buildHuntCoordinatorResultAttachmentId(runId);

          // Scoped to this request, so the placeholder is written as the identity that
          // created the Investigation over HTTP, the same one the hunt child's own
          // attachment steps run as.
          const attachmentsClient = await getAgentBuilderAttachments().getScopedClient({
            request,
          });
          await writeRunning({
            client: attachmentsClient,
            conversationId,
            attachmentId,
            runId,
            reportId: report_id,
          });

          void runHuntCoordinatorJob({
            clients: { esClient, reportsEsClient, mitreDataClient },
            models,
            logger,
            params: {
              report_id,
              spaceId,
              text,
              iocs,
              techniques,
              time_range,
              size,
              max_assets,
              llm_confidence_threshold,
              tier2_when,
              max_tier2_sample_events,
              trigger,
              indexPatterns,
              run_id: runId,
            },
            attachmentsClient,
            conversationId,
            attachmentId,
          });

          const body: HuntCoordinatorResponse = {
            run_id: runId,
            state: 'running',
            result_attachment_id: attachmentId,
          };
          return response.ok({ body });
        } catch (err) {
          logger.error(`hunt_coordinator route failed: ${(err as Error).message}`);
          return response.customError({
            statusCode: 500,
            body: { message: FAILED_MESSAGE },
          });
        }
      })
    );
};
