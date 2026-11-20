/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isValidLicense } from '@kbn/agent-builder-plugin/common/license';
import type { AgentBuilderPluginStart, ScopedModel } from '@kbn/agent-builder-server';
import type { KibanaRequest, Logger } from '@kbn/core/server';
import { isInferenceRequestError } from '@kbn/inference-common';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/server';
import type { AnalyticsGenerationUnavailableReason } from '../../common/analytics';

/** How usage of the model is attributed in inference telemetry. */
const TELEMETRY_PLUGIN_ID = 'search_homepage_analytics';

// Measured on the same sources: as valid as Agent Builder's default model in under half the time.
export const PREFERRED_GENERATION_ENDPOINT_ID = '.anthropic-claude-5.5-sonnet-chat_completion';
export const PREFERRED_ENDPOINT_RETRY_MS = 5 * 60 * 1000;

export interface AnalyticsGenerationConfig {
  enabled: boolean;
  sampleValues: boolean;
  connectorId?: string;
}

export interface GenerationDependencies {
  agentBuilder?: AgentBuilderPluginStart;
  licensing?: LicensingPluginStart;
}

/** The parts of a resolved model that generation uses. */
export interface GenerationModelHandle {
  connectorId: string;
  name: string;
  /** Asks the model for one structured answer, as the caller. */
  output: ScopedModel['inferenceClient']['output'];
  /** The calls made through this handle so far, with the tokens each one used. */
  getCalls: () => ReadonlyArray<{
    model?: string;
    tokens?: { prompt: number; completion: number };
  }>;
}

export type ResolvedGenerationModel =
  | { available: true; model: GenerationModelHandle }
  | { available: false; reason: AnalyticsGenerationUnavailableReason };

export interface PreferredEndpointTracker {
  shouldTry: () => boolean;
  markMissing: () => void;
}

/**
 * Remembers, in this Kibana process, that the deployment lacks the preferred endpoint, so that a
 * generation does not pay for a lookup that fails before every fallback.
 */
export const createPreferredEndpointTracker = ({
  retryAfterMs = PREFERRED_ENDPOINT_RETRY_MS,
}: { retryAfterMs?: number } = {}): PreferredEndpointTracker => {
  let missingAt: number | undefined;

  return {
    shouldTry: () => missingAt === undefined || Date.now() - missingAt >= retryAfterMs,
    markMissing: () => {
      missingAt = Date.now();
    },
  };
};

/**
 * The model that writes analytics for this caller, or why there is none. Agent Builder's server
 * contract checks neither its licence nor that a model exists, so both are checked here: the
 * licence with Agent Builder's own rule, the model by resolving it as the caller.
 * The operator's connector wins; otherwise the preferred endpoint is used where the deployment
 * has it, and Agent Builder's default model where it does not.
 */
export const resolveGenerationModel = async ({
  request,
  config,
  dependencies: { agentBuilder, licensing },
  preferredEndpoint,
  logger,
}: {
  request: KibanaRequest;
  config: AnalyticsGenerationConfig;
  dependencies: GenerationDependencies;
  preferredEndpoint: PreferredEndpointTracker;
  logger: Logger;
}): Promise<ResolvedGenerationModel> => {
  if (!config.enabled) {
    return { available: false, reason: 'disabled' };
  }
  if (agentBuilder === undefined) {
    return { available: false, reason: 'agentBuilderMissing' };
  }
  if (licensing === undefined || !isValidLicense(await licensing.getLicense())) {
    return { available: false, reason: 'license' };
  }

  /** Resolving a model looks its connector up, so it fails for an id the deployment lacks. */
  const resolve = async (connectorId?: string): Promise<GenerationModelHandle> => {
    const modelProvider = agentBuilder.runtime.createModelProvider({
      request,
      ...(connectorId !== undefined && { defaultConnectorId: connectorId }),
      telemetryMetadata: { pluginId: TELEMETRY_PLUGIN_ID },
    });
    const { connector, inferenceClient } = await modelProvider.getDefaultModel();

    return {
      connectorId: connector.connectorId,
      name: connector.name,
      output: inferenceClient.output.bind(inferenceClient),
      getCalls: () => modelProvider.getUsageStats().calls,
    };
  };

  const resolvePreferred = async (): Promise<GenerationModelHandle | undefined> => {
    if (!preferredEndpoint.shouldTry()) {
      return undefined;
    }
    try {
      return await resolve(PREFERRED_GENERATION_ENDPOINT_ID);
    } catch (error) {
      // Only a lookup that found no such endpoint is remembered; any other failure is retried.
      if (isInferenceRequestError(error) && error.meta.status === 404) {
        preferredEndpoint.markMissing();
      }
      logger.debug(
        `Falling back to the default model, ${PREFERRED_GENERATION_ENDPOINT_ID} could not be used: ${error.message}`
      );
      return undefined;
    }
  };

  try {
    const model =
      config.connectorId !== undefined
        ? await resolve(config.connectorId)
        : (await resolvePreferred()) ?? (await resolve());

    return { available: true, model };
  } catch (error) {
    logger.debug(`No model is available to generate analytics: ${error.message}`);
    return { available: false, reason: 'noModel' };
  }
};
