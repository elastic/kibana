/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsPublicPluginSetup } from '@kbn/workflows-extensions/public';

// Loaders keep the YAML-editor schemas out of the page-load bundle. They share this one
// `import()`, because each `import()` adds its own chunk-loading code to that bundle.
const loadStepDefinitions = () => import('./step_definitions');

export const registerAlertZeroPublicStepDefinitions = (
  workflowsExtensions: WorkflowsExtensionsPublicPluginSetup
) => {
  workflowsExtensions.registerStepDefinition(() =>
    loadStepDefinitions().then((m) => m.reportWorkerOutcomePublicStepDefinition)
  );
  workflowsExtensions.registerStepDefinition(() =>
    loadStepDefinitions().then((m) => m.triageStoreFpDecisionsPublicStepDefinition)
  );
  workflowsExtensions.registerStepDefinition(() =>
    loadStepDefinitions().then((m) => m.triageMatchFpDecisionsPublicStepDefinition)
  );
  workflowsExtensions.registerStepDefinition(() =>
    loadStepDefinitions().then((m) => m.triageRevokeFpDecisionPublicStepDefinition)
  );
  workflowsExtensions.registerStepDefinition(() =>
    loadStepDefinitions().then((m) => m.triageHeadroomPublicStepDefinition)
  );
  workflowsExtensions.registerStepDefinition(() =>
    loadStepDefinitions().then((m) => m.triagePlanSweepPublicStepDefinition)
  );
  workflowsExtensions.registerStepDefinition(() =>
    loadStepDefinitions().then((m) => m.triageLoadAlertsPublicStepDefinition)
  );
  workflowsExtensions.registerStepDefinition(() =>
    loadStepDefinitions().then((m) => m.triageTagPatternKeysPublicStepDefinition)
  );
  workflowsExtensions.registerStepDefinition(() =>
    loadStepDefinitions().then((m) => m.triageGroupFpCandidatesPublicStepDefinition)
  );
  workflowsExtensions.registerStepDefinition(() =>
    loadStepDefinitions().then((m) => m.triageJoinProposalPublicStepDefinition)
  );
  workflowsExtensions.registerStepDefinition(() =>
    loadStepDefinitions().then((m) => m.triageRetagProposalAlertsPublicStepDefinition)
  );
  workflowsExtensions.registerStepDefinition(() =>
    loadStepDefinitions().then((m) => m.resolveProposalsPublicStepDefinition)
  );
  workflowsExtensions.registerStepDefinition(() =>
    loadStepDefinitions().then((m) => m.summarizeInvestigationPublicStepDefinition)
  );
  workflowsExtensions.registerStepDefinition(() =>
    loadStepDefinitions().then((m) => m.packageReportPublicStepDefinition)
  );
};
