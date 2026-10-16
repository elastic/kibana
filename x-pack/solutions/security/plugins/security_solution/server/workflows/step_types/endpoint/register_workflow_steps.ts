/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';
import type { ExperimentalFeatures } from '../../../../common/experimental_features';
import type { EndpointAppContextService } from '../../../endpoint/endpoint_app_context_services';
import { findEndpointArtifactsStepDefinition } from './artifacts/find';
import { createSearchIntegrationKnowledgeStepDefinition } from './integration_knowledge';
import { createResolveEndpointHostsStepDefinition } from './hosts/resolve';
import { getEndpointHostDiagnosticsStepDefinition } from './hosts/diagnostics';
import { getEndpointInventoryCountsStepDefinition } from './hosts/inventory_counts';
import { getEndpointPackageStatusStepDefinition } from './package/status';

export interface RegisterEndpointWorkflowStepsDeps {
  experimentalFeatures: Pick<ExperimentalFeatures, 'automaticTroubleshootingUniversalSkill'>;
  getInternalEsClient: () => Promise<ElasticsearchClient> | ElasticsearchClient;
  endpointAppContextService: EndpointAppContextService;
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

  workflowsExtensions.registerStepDefinition(
    createResolveEndpointHostsStepDefinition({
      endpointAppContextService: deps.endpointAppContextService,
    })
  );
  workflowsExtensions.registerStepDefinition(getEndpointHostDiagnosticsStepDefinition);
  workflowsExtensions.registerStepDefinition(getEndpointPackageStatusStepDefinition);
  workflowsExtensions.registerStepDefinition(getEndpointInventoryCountsStepDefinition);
};
