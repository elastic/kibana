/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsPublicPluginSetup } from '@kbn/workflows-extensions/public';
import type { ExperimentalFeatures } from '../../../../common/experimental_features';

export interface RegisterEndpointWorkflowStepsDeps {
  experimentalFeatures: Pick<ExperimentalFeatures, 'automaticTroubleshootingUniversalSkill'>;
}

export const registerEndpointWorkflowSteps = (
  workflowsExtensions: WorkflowsExtensionsPublicPluginSetup,
  deps: RegisterEndpointWorkflowStepsDeps
): void => {
  if (!deps.experimentalFeatures.automaticTroubleshootingUniversalSkill) {
    return;
  }

  workflowsExtensions.registerStepDefinition(() =>
    import('./steps').then((m) => m.findEndpointArtifactsPublicStepDefinition)
  );
  workflowsExtensions.registerStepDefinition(() =>
    import('./steps').then((m) => m.searchIntegrationKnowledgePublicStepDefinition)
  );
};
