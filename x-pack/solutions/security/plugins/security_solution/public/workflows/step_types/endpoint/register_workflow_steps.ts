/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsPublicPluginSetup } from '@kbn/workflows-extensions/public';
import type { ExperimentalFeatures } from '../../../../common/experimental_features';

export interface RegisterEndpointWorkflowStepsDeps {
  experimentalFeatures: Pick<
    ExperimentalFeatures,
    'automaticTroubleshootingUniversalSkill' | 'elasticDefendPolicyManagementUniversalSkill'
  >;
}

export const registerEndpointWorkflowSteps = (
  workflowsExtensions: WorkflowsExtensionsPublicPluginSetup,
  deps: RegisterEndpointWorkflowStepsDeps
): void => {
  const { automaticTroubleshootingUniversalSkill, elasticDefendPolicyManagementUniversalSkill } =
    deps.experimentalFeatures;
  if (automaticTroubleshootingUniversalSkill || elasticDefendPolicyManagementUniversalSkill) {
    workflowsExtensions.registerStepDefinition(() =>
      import('./steps').then((m) => m.searchIntegrationKnowledgePublicStepDefinition)
    );
  }
  if (elasticDefendPolicyManagementUniversalSkill) {
    workflowsExtensions.registerStepDefinition(() =>
      import('./steps').then((m) => m.getEndpointPolicyFieldReferencePublicStepDefinition)
    );
    workflowsExtensions.registerStepDefinition(() =>
      import('./steps').then((m) => m.listEndpointPoliciesPublicStepDefinition)
    );
    workflowsExtensions.registerStepDefinition(() =>
      import('./steps').then((m) => m.getEndpointPolicyPublicStepDefinition)
    );
    workflowsExtensions.registerStepDefinition(() =>
      import('./steps').then((m) => m.getEndpointPolicyBaselinePublicStepDefinition)
    );
    workflowsExtensions.registerStepDefinition(() =>
      import('./steps').then((m) => m.compareEndpointPoliciesPublicStepDefinition)
    );
    workflowsExtensions.registerStepDefinition(() =>
      import('./steps').then((m) => m.getEndpointPolicyRolloutStatusPublicStepDefinition)
    );
    workflowsExtensions.registerStepDefinition(() =>
      import('./steps').then((m) => m.assessEndpointPolicyChangePublicStepDefinition)
    );
    workflowsExtensions.registerStepDefinition(() =>
      import('./steps').then((m) => m.applyEndpointPolicyChangePublicStepDefinition)
    );
  }
  if (automaticTroubleshootingUniversalSkill) {
    workflowsExtensions.registerStepDefinition(() =>
      import('./steps').then((m) => m.findEndpointArtifactsPublicStepDefinition)
    );

    workflowsExtensions.registerStepDefinition(() =>
      import('./steps').then((m) => m.resolveEndpointHostsPublicStepDefinition)
    );
    workflowsExtensions.registerStepDefinition(() =>
      import('./steps').then((m) => m.getEndpointHostDiagnosticsPublicStepDefinition)
    );
    workflowsExtensions.registerStepDefinition(() =>
      import('./steps').then((m) => m.getEndpointPackageStatusPublicStepDefinition)
    );
    workflowsExtensions.registerStepDefinition(() =>
      import('./steps').then((m) => m.getEndpointInventoryCountsPublicStepDefinition)
    );

    workflowsExtensions.registerStepDefinition(() =>
      import('./steps').then((m) => m.finalizeTroubleshootingDiagnosisPublicStepDefinition)
    );
  }
};
