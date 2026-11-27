/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, ElasticsearchClient, KibanaRequest, Logger } from '@kbn/core/server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { AgenticInvestigationsPluginStart } from '@kbn/agentic-investigations-plugin/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import { NIGHTSHIFT_ALERT_OUTCOMES_USAGE_ID } from '@kbn/nightshift-shared';
import type { RawRoundStep } from '../investigation_round';
import {
  createInvestigationBackgroundTelemetry,
  createOptimizeModel,
} from '../lib/create_optimize_model';
import type { NightshiftTelemetryClient } from '../telemetry';
import type { TrackInvestigationDeps } from './track_investigation';
import { AlertOutcomeTrackingStore } from './tracking_store';

export interface AlertOutcomeServicesDeps {
  isEnabled: () => boolean;
  getInternalEsClient: () => ElasticsearchClient | undefined;
  getActions: () => ActionsPluginStart | undefined;
  getAgentBuilder: () => AgentBuilderPluginStart | undefined;
  getAgenticInvestigations: () => AgenticInvestigationsPluginStart | undefined;
  getInference: () => InferenceServerStart | undefined;
  getSavedObjects: () => CoreStart['savedObjects'] | undefined;
  getUiSettings: () => CoreStart['uiSettings'] | undefined;
  telemetry?: NightshiftTelemetryClient;
  logger: Logger;
}

export interface AlertOutcomeServices {
  /** Deps of the extract and verify step, scoped to the investigation run's request. */
  getTrackDeps: (
    request: KibanaRequest,
    options: { investigationId: string; roundConnectorId?: string }
  ) => Promise<TrackInvestigationDeps>;
}

/** Builds alert outcome dependencies lazily, since they read plugin start contracts. */
export const createAlertOutcomeServices = (
  deps: AlertOutcomeServicesDeps
): AlertOutcomeServices => {
  let trackingStore: AlertOutcomeTrackingStore | undefined;
  const getTrackingStore = () => {
    if (!trackingStore) {
      const esClient = deps.getInternalEsClient();
      if (!esClient) throw new Error('Elasticsearch is not available');
      trackingStore = new AlertOutcomeTrackingStore(esClient, deps.logger);
    }
    return trackingStore;
  };
  const requireStart = () => {
    const actions = deps.getActions();
    const agentBuilder = deps.getAgentBuilder();
    if (!actions || !agentBuilder) throw new Error('Connectors or Agent Builder are not available');
    return { actions, agentBuilder };
  };

  return {
    async getTrackDeps(request, { investigationId, roundConnectorId }) {
      const { actions, agentBuilder } = requireStart();
      const agenticInvestigations = deps.getAgenticInvestigations();
      if (!agenticInvestigations) throw new Error('Agentic investigations are not available');
      const [actionsClient, conversations] = await Promise.all([
        actions.getActionsClientWithRequest(request),
        agentBuilder.conversations.getScopedClient({ request }),
      ]);
      return {
        trackingStore: getTrackingStore(),
        isEnabled: deps.isEnabled,
        listSubjects: async (id) =>
          (await agenticInvestigations.getSubjectsClient(request).listByConversationIds([id])).map(
            ({ subjectType, slack }) => ({ subjectType, slack })
          ),
        getFirstRound: async (id) => {
          const [round] = (await conversations.get(id)).rounds;
          return round
            ? {
                message: round.input?.message ?? '',
                startedAt: round.started_at,
                steps: round.steps as unknown as RawRoundStep[],
              }
            : undefined;
        },
        actionsClient,
        getInferenceClient: async () =>
          (
            await createOptimizeModel({
              request,
              roundConnectorId,
              agentBuilder,
              inference: deps.getInference(),
              savedObjects: deps.getSavedObjects(),
              uiSettings: deps.getUiSettings(),
              telemetryMetadata: createInvestigationBackgroundTelemetry(
                NIGHTSHIFT_ALERT_OUTCOMES_USAGE_ID,
                investigationId
              ),
              logger: deps.logger,
            })
          )?.inferenceClient,
        telemetry: deps.telemetry,
        logger: deps.logger,
      };
    },
  };
};
