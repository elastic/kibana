/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isValidLicense } from '@kbn/agent-builder-plugin/common/license';
import type { AgentBuilderPluginStart, ScopedModel } from '@kbn/agent-builder-server';
import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/server';
import type { AnalyticsGenerationUnavailableReason } from '../../common/analytics';

/** How usage of the model is attributed in inference telemetry. */
const TELEMETRY_PLUGIN_ID = 'search_homepage_analytics';

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

/**
 * The model that writes analytics for this caller, or why there is none. Agent Builder's server
 * contract checks neither its licence nor that a model exists, so both are checked here: the
 * licence with Agent Builder's own rule, the model by resolving it as the caller.
 */
export const resolveGenerationModel = async ({
  request,
  config,
  dependencies: { agentBuilder, licensing },
  connectorId = config.connectorId,
  logger,
}: {
  request: KibanaRequest;
  config: AnalyticsGenerationConfig;
  dependencies: GenerationDependencies;
  /** A connector or inference endpoint to use instead of the default model. */
  connectorId?: string;
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

  const modelProvider = agentBuilder.runtime.createModelProvider({
    request,
    ...(connectorId !== undefined && { defaultConnectorId: connectorId }),
    telemetryMetadata: { pluginId: TELEMETRY_PLUGIN_ID },
  });
  try {
    const { connector, inferenceClient } = await modelProvider.getDefaultModel();

    return {
      available: true,
      model: {
        connectorId: connector.connectorId,
        name: connector.name,
        output: inferenceClient.output.bind(inferenceClient),
        getCalls: () => modelProvider.getUsageStats().calls,
      },
    };
  } catch (error) {
    logger.debug(`No model is available to generate analytics: ${error.message}`);
    return { available: false, reason: 'noModel' };
  }
};
