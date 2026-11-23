/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import { WORKFLOWS_CORE_SELF_CLIENT_ENABLED_FLAG } from '@kbn/workflows';
import {
  ALERTZERO_HUNT_PROPOSAL_GATE_WORKFLOW_ID,
  getManagedWorkflowDefinition,
} from '@kbn/workflows/managed';
import { WorkflowRunFixture } from '@kbn/workflows-execution-engine/test_helpers';

const EXECUTION_ID = 'fake_workflow_execution_id';
const PROPOSAL_ID = '6f1a8c2e-2f47-5c4b-9a33-7d2a1b4e6c50';

/**
 * What the gate's lookup of the Proposal under its id finds: a Proposal on some conversation,
 * a failed read, or nothing (404).
 */
export type ExistingProposal = { conversationId: string } | 'error' | undefined;

const gateYaml = (): string => {
  const definition = getManagedWorkflowDefinition(ALERTZERO_HUNT_PROPOSAL_GATE_WORKFLOW_ID);
  if (!definition || !('yaml' in definition) || typeof definition.yaml !== 'string') {
    throw new Error(`Managed definition ${ALERTZERO_HUNT_PROPOSAL_GATE_WORKFLOW_ID} has no yaml`);
  }
  return definition.yaml;
};

const jsonResponse = (url: string, body: unknown, status: number) => ({
  request: { url },
  response: new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  }),
});

export const baseInputs = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  conversationId: 'conv-1',
  proposalId: PROPOSAL_ID,
  title: 'Isolate host A',
  comment: 'Isolate the host',
  category: 'containment',
  investigationConversationId: 'inv-1',
  runId: 'run-1',
  closureSummary: 'closed',
  expectedProposalCount: 1,
  reportId: 'report-1',
  ...overrides,
});

/**
 * Runs the shipped gate through the real engine. The harness has no workflow registry, so
 * `create_and_gate_proposal` fails with `Workflow not found`, which the gate handles exactly as it
 * handles a refused create from the real bridge. Every `kibana.request` goes to a stub self client
 * that answers the Proposal lookup from `existingProposal` and reports no Proposals on the
 * Investigation, so settlement never closes it.
 */
export const createGateFixture = ({ existingProposal }: { existingProposal: ExistingProposal }) => {
  const engine = new WorkflowRunFixture();

  Object.assign(engine.fakeKibanaRequest, {
    headers: { authorization: 'ApiKey workflow-execution-test' },
    isFakeRequest: true,
  });
  const { coreStart } = engine.dependencies;
  // With the flag off the step takes the legacy transport to a real localhost socket.
  (coreStart.featureFlags.getBooleanValue$ as unknown as jest.Mock).mockImplementation(
    (flag: string, fallback: boolean) =>
      of(flag === WORKFLOWS_CORE_SELF_CLIENT_ENABLED_FLAG ? true : fallback)
  );
  (coreStart.http.basePath.prepend as unknown as jest.Mock).mockImplementation(
    (path: string) => path
  );
  const fetch = jest.fn(async (path: string) => {
    const url = `http://localhost:5601${path}`;
    if (path.endsWith(`/internal/proposals/${PROPOSAL_ID}`)) {
      if (existingProposal === 'error') {
        return jsonResponse(url, { message: 'boom' }, 500);
      }
      return existingProposal
        ? jsonResponse(url, existingProposal, 200)
        : jsonResponse(url, { message: 'not found' }, 404);
    }
    if (path.endsWith('/internal/proposals')) {
      return jsonResponse(url, { total: 0, proposals: [] }, 200);
    }
    return jsonResponse(url, { message: 'not found' }, 404);
  });
  (coreStart.http.selfClient as unknown as { asScoped: jest.Mock }).asScoped.mockReturnValue({
    fetch,
  });

  const stepExecutions = (stepId: string) =>
    [...engine.stepExecutionRepositoryMock.stepExecutions.values()].filter(
      (step) => step.stepId === stepId
    );

  return {
    engine,
    run: (inputs: Record<string, unknown>) =>
      engine.runWorkflow({ workflowYaml: gateYaml(), inputs }),
    stepExecutions,
    execution: () => engine.workflowExecutionRepositoryMock.workflowExecutions.get(EXECUTION_ID),
    renderedMessage: (stepId: string): string | undefined => {
      const [step] = stepExecutions(stepId);
      return (step?.input as { inputs?: { message?: string } } | undefined)?.inputs?.message;
    },
  };
};
