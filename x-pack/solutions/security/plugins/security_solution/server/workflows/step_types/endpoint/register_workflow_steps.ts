/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';
import type { ExperimentalFeatures } from '../../../../common/experimental_features';
import { findEndpointArtifactsStepDefinition } from './artifacts/find';
import { createSearchIntegrationKnowledgeStepDefinition } from './integration_knowledge';

export interface RegisterEndpointWorkflowStepsDeps {
  experimentalFeatures: Pick<ExperimentalFeatures, 'automaticTroubleshootingUniversalSkill'>;
  getInternalEsClient: () => Promise<ElasticsearchClient> | ElasticsearchClient;
}

export const registerEndpointWorkflowSteps = (
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup,
  deps: RegisterEndpointWorkflowStepsDeps
): void => {
  if (!deps.experimentalFeatures.automaticTroubleshootingUniversalSkill) {
    return;
  }

  workflowsExtensions.registerStepDefinition(findEndpointArtifactsStepDefinition);
  workflowsExtensions.registerStepDefinition(
    createSearchIntegrationKnowledgeStepDefinition({
      getInternalEsClient: deps.getInternalEsClient,
    })
  );
};
