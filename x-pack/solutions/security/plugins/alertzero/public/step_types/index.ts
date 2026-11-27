/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsPublicPluginSetup } from '@kbn/workflows-extensions/public';

/** Loaders keep the YAML-editor schemas out of the page-load bundle. */
export const registerAlertZeroPublicStepDefinitions = (
  workflowsExtensions: WorkflowsExtensionsPublicPluginSetup
) => {
  workflowsExtensions.registerStepDefinition(() =>
    import('./report_worker_outcome_step').then((m) => m.reportWorkerOutcomePublicStepDefinition)
  );
  workflowsExtensions.registerStepDefinition(() =>
    import('./triage_decision_steps').then((m) => m.triageStoreFpDecisionsPublicStepDefinition)
  );
  workflowsExtensions.registerStepDefinition(() =>
    import('./triage_decision_steps').then((m) => m.triageMatchFpDecisionsPublicStepDefinition)
  );
  workflowsExtensions.registerStepDefinition(() =>
    import('./triage_decision_steps').then((m) => m.triageRevokeFpDecisionPublicStepDefinition)
  );
  workflowsExtensions.registerStepDefinition(() =>
    import('./alert_triage_steps').then((m) => m.triageHeadroomPublicStepDefinition)
  );
  workflowsExtensions.registerStepDefinition(() =>
    import('./alert_triage_steps').then((m) => m.triagePlanSweepPublicStepDefinition)
  );
  workflowsExtensions.registerStepDefinition(() =>
    import('./alert_triage_steps').then((m) => m.triageLoadAlertsPublicStepDefinition)
  );
  workflowsExtensions.registerStepDefinition(() =>
    import('./alert_triage_steps').then((m) => m.triageTagPatternKeysPublicStepDefinition)
  );
  workflowsExtensions.registerStepDefinition(() =>
    import('./alert_triage_steps').then((m) => m.triageGroupFpCandidatesPublicStepDefinition)
  );
  workflowsExtensions.registerStepDefinition(() =>
    import('./alert_triage_steps').then((m) => m.triageJoinProposalPublicStepDefinition)
  );
  workflowsExtensions.registerStepDefinition(() =>
    import('./alert_triage_steps').then((m) => m.triageRetagProposalAlertsPublicStepDefinition)
  );
  workflowsExtensions.registerStepDefinition(() =>
    import('./resolve_proposals_step').then((m) => m.resolveProposalsPublicStepDefinition)
  );
  workflowsExtensions.registerStepDefinition(() =>
    import('./summarize_investigation_step').then(
      (m) => m.summarizeInvestigationPublicStepDefinition
    )
  );
  workflowsExtensions.registerStepDefinition(() =>
    import('./package_report_step').then((m) => m.packageReportPublicStepDefinition)
  );
};
