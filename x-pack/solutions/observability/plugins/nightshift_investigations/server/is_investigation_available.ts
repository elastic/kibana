/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom } from 'rxjs';
import type { FeatureFlagsStart, KibanaRequest, Logger } from '@kbn/core/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import { resolveNightshiftModel } from '@kbn/nightshift-ai';
import { NIGHTSHIFT_ENABLED_FLAG } from '@kbn/nightshift-shared';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';
import { NIGHTSHIFT_INVESTIGATION_WORKFLOW_ID } from '@kbn/workflows/managed';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';

export interface InvestigationInfrastructureAvailabilityDependencies {
  request: KibanaRequest;
  featureFlags: FeatureFlagsStart;
  agentBuilder?: AgentBuilderPluginStart;
  inference?: InferenceServerStart;
  logger: Logger;
  spaceId?: string;
  spaces?: SpacesPluginStart;
  workflowsExtensions?: WorkflowsExtensionsServerPluginStart;
  workflowsManagement?: WorkflowsServerPluginSetup;
}

export const isInvestigationInfrastructureAvailable = async ({
  request,
  featureFlags,
  agentBuilder,
  inference,
  logger,
  spaceId,
  spaces,
  workflowsExtensions,
  workflowsManagement,
}: InvestigationInfrastructureAvailabilityDependencies): Promise<boolean> => {
  const isFlagEnabled = await firstValueFrom(
    featureFlags.getBooleanValue$(NIGHTSHIFT_ENABLED_FLAG, false)
  );
  if (!isFlagEnabled) {
    return false;
  }

  if (!agentBuilder || !inference || !workflowsExtensions || !workflowsManagement) {
    return false;
  }

  try {
    const resolvedSpaceId =
      spaceId ?? spaces?.spacesService.getSpaceId(request) ?? DEFAULT_SPACE_ID;
    const workflow = await workflowsManagement.management
      .getClient(request)
      .getWorkflow(NIGHTSHIFT_INVESTIGATION_WORKFLOW_ID, resolvedSpaceId);

    return Boolean(workflow?.definition);
  } catch (error) {
    logger.warn(`Failed to check investigation infrastructure availability: ${String(error)}`);
    return false;
  }
};

export const isInvestigationRunAvailable = async ({
  connectorId,
  ...dependencies
}: InvestigationInfrastructureAvailabilityDependencies & {
  connectorId?: string;
}): Promise<boolean> => {
  if (!(await isInvestigationInfrastructureAvailable(dependencies))) {
    return false;
  }

  const { inference, request, logger } = dependencies;
  if (!inference) {
    return false;
  }

  try {
    const inferenceClient = inference.getClient({ request });
    await resolveNightshiftModel({
      step: 'investigation',
      requestedId: connectorId,
      validateConnector: async (id) => ({
        connectorId: (await inferenceClient.getConnectorById(id)).connectorId,
      }),
      // Availability reports whether the model resolves. The restriction is checked on start so
      // a blocked model remains visible and produces the setting-specific error.
      getModelRestriction: async () => ({ defaultOnly: false }),
    });
    return true;
  } catch (error) {
    logger.warn(`Failed to check investigation model availability: ${String(error)}`);
    return false;
  }
};
