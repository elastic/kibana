/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, Logger } from '@kbn/core/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { WorkflowsExtensionsTasksSetup } from '@kbn/workflows-extensions/server/tasks';
import { resolveModelStepDefinition } from './step_definitions/resolve_model';
import { classifyDetectionsStepDefinition } from './step_definitions/classify_detections';
import { registerSignificantEventsWorkflowTriggers } from './workflows/triggers/register_triggers';

/**
 * What significant events registers on workflows extensions: the workflow steps and triggers. Kibana's `server`
 * entry and the task pod's `server/tasks` entry both call these, so a workflow or an agent run sees
 * the same definitions in either place.
 */
export const registerSignificantEventsWorkflowExtensions = ({
  workflowsExtensions,
  getInference,
  getSavedObjects,
  getUiSettings,
  logger,
}: {
  workflowsExtensions: Pick<
    WorkflowsExtensionsTasksSetup,
    'registerStepDefinition' | 'registerTriggerDefinition'
  >;
  getInference: () => InferenceServerStart | undefined;
  getSavedObjects: () => CoreStart['savedObjects'] | undefined;
  getUiSettings: () => CoreStart['uiSettings'] | undefined;
  logger: Logger;
}): void => {
  workflowsExtensions.registerStepDefinition(
    resolveModelStepDefinition({
      getInference,
      getSavedObjects,
      getUiSettings,
      logger: logger.get('resolve_model'),
    })
  );
  workflowsExtensions.registerStepDefinition(
    classifyDetectionsStepDefinition({ logger: logger.get('classify_detections') })
  );

  // Custom event-driven triggers users can subscribe to from their own workflows.
  registerSignificantEventsWorkflowTriggers(workflowsExtensions);
};
