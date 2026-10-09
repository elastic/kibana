/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse } from 'yaml';
import { buildFieldsZodValidator } from '@kbn/workflows';
import {
  ALERTZERO_MANAGED_WORKER_WORKFLOW_IDS,
  getManagedWorkflowDefinition,
  ALERTZERO_WORKER_FORENSICS_ENDPOINT_ANALYSIS_WORKFLOW_ID,
  ALERTZERO_FORENSICS_RUN_ENDPOINT_ANALYSIS_WORKFLOW_ID,
  ALERTZERO_CREATE_PROPOSAL_WORKFLOW_ID,
  CREATE_PROPOSAL_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import {
  getWorkerSettingsDeclaration,
  getCompleteWorkerSettingsSchema,
} from '@kbn/alertzero-common';

export interface AlertZeroStep {
  name: string;
  type: string;
  with?: Record<string, unknown>;
  steps?: AlertZeroStep[];
  else?: AlertZeroStep[];
}
export interface AlertZeroDefinition {
  steps: AlertZeroStep[];
  triggers: Array<{ type: string; inputs?: Parameters<typeof buildFieldsZodValidator>[0] }>;
  consts: Record<string, unknown>;
}
export const flattenSteps = (steps: AlertZeroStep[]): AlertZeroStep[] =>
  steps.flatMap((step) => [
    step,
    ...flattenSteps(step.steps ?? []),
    ...flattenSteps(step.else ?? []),
  ]);
export const analysisWorkflowId = ALERTZERO_FORENSICS_RUN_ENDPOINT_ANALYSIS_WORKFLOW_ID;
export const workerWorkflowId = ALERTZERO_WORKER_FORENSICS_ENDPOINT_ANALYSIS_WORKFLOW_ID;
export const proposalWorkflowId = ALERTZERO_CREATE_PROPOSAL_WORKFLOW_ID;
// The gate the bridge forwards to. L4 starts it directly: the bridge's `run-as-mode: inherit` only works
// under a managed parent running as a service account, which a plain API caller cannot be.
export const gateWorkflowId = CREATE_PROPOSAL_WORKFLOW_ID;
const analysisWorkflow = getManagedWorkflowDefinition(analysisWorkflowId);
const workerWorkflow = getManagedWorkflowDefinition(workerWorkflowId);
if (!analysisWorkflow?.yaml || !workerWorkflow?.yamlTemplate) {
  throw new Error('Missing production AlertZero workflow definitions');
}
export const analysisYaml = analysisWorkflow.yaml;
export const analysisDefinition = parse(analysisYaml) as AlertZeroDefinition;
export const workerYaml = workerWorkflow.yamlTemplate({
  settingsVersion: 1,
  autonomyLevel: 'manual',
});
export const workerDefinition = parse(workerYaml) as AlertZeroDefinition;
export const findAnalysisStep = (name: string): AlertZeroStep => {
  const step = flattenSteps(analysisDefinition.steps).find((candidate) => candidate.name === name);
  if (!step) throw new Error(`Missing production AlertZero step: ${name}`);
  return step;
};
export const analysisOutputSchema = JSON.parse(
  JSON.stringify(findAnalysisStep('forensic_analysis').with?.schema).replace(
    '"${{ consts.max_recommended_actions }}"',
    JSON.stringify(analysisDefinition.consts.max_recommended_actions)
  )
) as Parameters<typeof buildFieldsZodValidator>[0];
export const analysisOutputValidator = buildFieldsZodValidator(analysisOutputSchema);
const manualInputs = analysisDefinition.triggers.find(
  (trigger) => trigger.type === 'manual'
)?.inputs;
if (!manualInputs) throw new Error('Missing production AlertZero manual input schema');
export const analysisInputValidator = buildFieldsZodValidator(manualInputs);
// The production bridge `system-create-alertzero-proposal`, the only door the worker uses
// into the proposal gate. Parsed here so the L0 contract can pin its origin stamping; L4
// cannot execute it live because its `run-as-mode: inherit` requires a managed parent
// running as a service account, which a plain API caller cannot be (see endpoint_analysis L4).
const proposalBridge = getManagedWorkflowDefinition(proposalWorkflowId);
if (!proposalBridge?.yaml) {
  throw new Error('Missing production AlertZero proposal bridge definition');
}
export const proposalBridgeDefinition = parse(proposalBridge.yaml) as AlertZeroDefinition;
export const assertAlertZeroContracts = () => {
  if (!new Set<string>(ALERTZERO_MANAGED_WORKER_WORKFLOW_IDS).has(workerWorkflowId)) {
    throw new Error('Endpoint analysis is not registered as a managed worker');
  }
  const declaration = getWorkerSettingsDeclaration(workerWorkflowId);
  if (declaration.allowedAutonomyLevels.join(',') !== 'manual,supervised') {
    throw new Error('Endpoint analysis autonomy contract changed');
  }
  getCompleteWorkerSettingsSchema(workerWorkflowId).parse({
    workerId: workerWorkflowId,
    autonomy: 'manual',
  });
  const dispatch = flattenSteps(workerDefinition.steps).find((step) => step.name === 'start_run');
  if (
    dispatch?.type !== 'workflow.executeAsync' ||
    dispatch.with?.['workflow-id'] !== analysisWorkflowId
  ) {
    throw new Error('Endpoint sweep does not dispatch the production analysis workflow');
  }
  if (findAnalysisStep('propose_action').with?.['workflow-id'] !== proposalWorkflowId) {
    throw new Error('Endpoint analysis bypasses the AlertZero proposal gate');
  }
  // The bridge must stamp `origin: alertzero` itself — the gate's inputs close to
  // additional properties and callers cannot pass one — so the worker's proposals land in
  // AlertZero's queue rather than disappearing. L4 starts the gate directly (the bridge's
  // run-as-mode: inherit is unreachable for an API caller), so this contract is what
  // catches a regression that drops the stamp: without it, the live suite would pass.
  const forward = flattenSteps(proposalBridgeDefinition.steps).find(
    (step) => step.name === 'create_proposal'
  );
  if (forward?.type !== 'workflow.execute' || forward.with?.['workflow-id'] !== gateWorkflowId) {
    throw new Error('AlertZero proposal bridge does not forward to the proposal gate');
  }
  if ((forward.with?.inputs as { origin?: string } | undefined)?.origin !== 'alertzero') {
    throw new Error('AlertZero proposal bridge does not stamp origin: alertzero');
  }
};
