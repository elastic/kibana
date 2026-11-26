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
import { createGetEndpointInventoryCountsStepDefinition } from './hosts/inventory_counts';
import { createGetEndpointPackageStatusStepDefinition } from './package/status';
import {
  createFinalizeTroubleshootingDiagnosisStepDefinition,
  type EndpointConfigurationTroubleshootingAnalyticsReporter,
} from './configuration_troubleshooting/finalize';

import {
  createGetEndpointPolicyFieldReferenceStepDefinition,
  createListEndpointPoliciesStepDefinition,
  createGetEndpointPolicyStepDefinition,
  createGetEndpointPolicyBaselineStepDefinition,
  createCompareEndpointPoliciesStepDefinition,
  createGetEndpointPolicyRolloutStatusStepDefinition,
  createAssessEndpointPolicyChangeStepDefinition,
  createApplyEndpointPolicyChangeStepDefinition,
} from './policies/steps';

export interface RegisterEndpointWorkflowStepsDeps {
  experimentalFeatures: Pick<
    ExperimentalFeatures,
    'automaticTroubleshootingUniversalSkill' | 'elasticDefendPolicyManagementUniversalSkill'
  >;
  analytics: EndpointConfigurationTroubleshootingAnalyticsReporter;
  getInternalEsClient: () => Promise<ElasticsearchClient> | ElasticsearchClient;
  endpointAppContextService: EndpointAppContextService;
}

export const registerEndpointWorkflowSteps = (
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup,
  deps: RegisterEndpointWorkflowStepsDeps
): void => {
  const { automaticTroubleshootingUniversalSkill, elasticDefendPolicyManagementUniversalSkill } =
    deps.experimentalFeatures;
  if (automaticTroubleshootingUniversalSkill || elasticDefendPolicyManagementUniversalSkill) {
    workflowsExtensions.registerStepDefinition(
      createSearchIntegrationKnowledgeStepDefinition({
        getInternalEsClient: deps.getInternalEsClient,
      })
    );
  }
  if (elasticDefendPolicyManagementUniversalSkill) {
    workflowsExtensions.registerStepDefinition(
      createGetEndpointPolicyFieldReferenceStepDefinition(deps.endpointAppContextService)
    );
    workflowsExtensions.registerStepDefinition(
      createListEndpointPoliciesStepDefinition(deps.endpointAppContextService)
    );
    workflowsExtensions.registerStepDefinition(
      createGetEndpointPolicyStepDefinition(deps.endpointAppContextService)
    );
    workflowsExtensions.registerStepDefinition(
      createGetEndpointPolicyBaselineStepDefinition(deps.endpointAppContextService)
    );
    workflowsExtensions.registerStepDefinition(
      createCompareEndpointPoliciesStepDefinition(deps.endpointAppContextService)
    );
    workflowsExtensions.registerStepDefinition(
      createGetEndpointPolicyRolloutStatusStepDefinition(deps.endpointAppContextService)
    );
    workflowsExtensions.registerStepDefinition(
      createAssessEndpointPolicyChangeStepDefinition(deps.endpointAppContextService)
    );
    workflowsExtensions.registerStepDefinition(
      createApplyEndpointPolicyChangeStepDefinition(deps.endpointAppContextService)
    );
  }
  if (automaticTroubleshootingUniversalSkill) {
    workflowsExtensions.registerStepDefinition(findEndpointArtifactsStepDefinition);

    workflowsExtensions.registerStepDefinition(
      createResolveEndpointHostsStepDefinition({
        endpointAppContextService: deps.endpointAppContextService,
      })
    );
    workflowsExtensions.registerStepDefinition(getEndpointHostDiagnosticsStepDefinition);
    workflowsExtensions.registerStepDefinition(
      createGetEndpointPackageStatusStepDefinition(deps.endpointAppContextService.isServerless())
    );
    workflowsExtensions.registerStepDefinition(
      createGetEndpointInventoryCountsStepDefinition(deps.endpointAppContextService)
    );

    workflowsExtensions.registerStepDefinition(
      createFinalizeTroubleshootingDiagnosisStepDefinition({ analytics: deps.analytics })
    );
  }
};
