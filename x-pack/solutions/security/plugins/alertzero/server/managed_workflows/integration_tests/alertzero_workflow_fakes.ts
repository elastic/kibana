/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Fakes, YAML readers and ending readers that every AlertZero review workflow
 * shares: the proposal workflow (the human gate) and the investigation steps.
 */

import { isDeepStrictEqual } from 'node:util';
import { ALERTZERO_CREATE_PROPOSAL_WORKFLOW_ID } from '@kbn/workflows/managed';
import {
  managedWorkflow,
  workflowInputErrors,
  type FakeChildWorkflow,
  type FakeStep,
  type JsonSchema,
  type ManagedWorkflowRun,
  type RecordedCall,
  type ParsedWorkflow,
} from '@kbn/workflows-execution-engine/test_helpers';

export const PROPOSAL_WORKFLOW_ID = ALERTZERO_CREATE_PROPOSAL_WORKFLOW_ID;

/** The run of a case. Throws when no case has that name, so a renamed case fails with a clear message. */
export const caseRun = (
  runs: ReadonlyMap<string, ManagedWorkflowRun>,
  caseName: string
): ManagedWorkflowRun => {
  const run = runs.get(caseName);
  if (!run) {
    throw new Error(`No case named "${caseName}" ran.`);
  }
  return run;
};

/**
 * The values a schema allows for one field: `properties.<field>.enum`, or the
 * `properties.<field>.const` of each `oneOf` member.
 */
export const schemaFieldValues = (schema: JsonSchema, field: string): string[] => {
  const own = schema.properties?.[field];
  return [
    ...(own?.enum ?? []),
    ...(own?.const !== undefined ? [own.const] : []),
    ...(schema.oneOf ?? []).flatMap((member) => schemaFieldValues(member, field)),
  ];
};

/** The values the first trigger allows for one input, from its `enum`. */
export const triggerInputValues = ({ definition }: ParsedWorkflow, input: string): string[] => [
  ...(definition.triggers?.[0]?.inputs?.properties?.[input]?.enum ?? []),
];

/** The output names a managed workflow declares, read from its shipped YAML. */
export const declaredOutputs = (workflowId: string): string[] =>
  (managedWorkflow(workflowId).definition.outputs ?? []).map(({ name }) => name);

/** The values in `declared` that no case covers. */
export const valuesWithoutCase = (
  declared: readonly string[],
  covered: Iterable<string | undefined>
): string[] => {
  const coveredSet = new Set(covered);
  return declared.filter((value) => !coveredSet.has(value));
};

export const GATE_DECISIONS = ['approved', 'dismissed', 'expired'] as const;
export type GateDecision = (typeof GATE_DECISIONS)[number];

/**
 * The only results `system-create-proposal` can return (see `output_result` in
 * proposals/create_proposal.yaml). A failed action parks the gate again, so
 * "approved, action failed" never reaches the caller.
 */
export const gateResult = (decision: GateDecision, hasAction: boolean): Record<string, unknown> => {
  if (decision === 'expired') {
    return { proposalId: 'proposal-1', status: 'expired', decision: '' };
  }
  if (decision === 'dismissed') {
    return { proposalId: 'proposal-1', status: 'no_action', decision: 'dismissed' };
  }
  return {
    proposalId: 'proposal-1',
    status: hasAction ? 'succeeded' : 'no_action',
    decision: 'approved',
  };
};

/** The human decisions of a case: at the manual autonomy entry gate, and at every other proposal. */
export interface GateAnswers {
  readonly entry?: GateDecision;
  readonly gate?: GateDecision;
}

/**
 * Fake for the AlertZero proposal workflow. The manual entry gate (`propose_entry`)
 * uses the `entry` answer, and every other proposal step uses `gate`.
 */
export const proposalWorkflowFake =
  ({ entry, gate }: GateAnswers): FakeChildWorkflow =>
  (inputs, parentStepId) => {
    const decision = parentStepId === 'propose_entry' ? entry : gate;
    if (decision === undefined) {
      throw new Error(`The case gives no decision for ${parentStepId}.`);
    }
    return gateResult(decision, Boolean(inputs.actionWorkflowId));
  };

/** Gate results that use an output the proposal workflow does not declare. Must be empty. */
export const undeclaredGateOutputs = (): string[] => {
  const declared = declaredOutputs(PROPOSAL_WORKFLOW_ID);
  const returned = GATE_DECISIONS.flatMap((decision) =>
    [true, false].flatMap((hasAction) => Object.keys(gateResult(decision, hasAction)))
  );
  return [...new Set(returned)].filter((name) => !declared.includes(name));
};

/** Fakes of the investigation and report steps, for the cases that do not make one of them fail. */
export const INVESTIGATION_STEP_FAKES: Readonly<Record<string, FakeStep>> = {
  'ai.conversation.create': { conversation_id: 'investigation-1' },
  'ai.conversation.add_user_message': { conversation_id: 'investigation-1' },
  'ai.attachment.add': { attachment_id: 'attachment-1' },
  'ai.attachment.update': { attachment_id: 'attachment-1' },
  // The report steps after a close read `changed_fields`, so the fake reports every field it got.
  'ai.conversation.metadata.patch': ({ conversation_id: conversationId, updates }) => ({
    conversation_id: conversationId,
    changed_fields: Object.keys((updates as Record<string, unknown> | undefined) ?? {}),
    metadata: updates,
  }),
  'alertzero.reportWorkerOutcome': { reported: true },
};

/** The inputs of every call to a custom step type that did not fail. */
export const succeededStepInputs = (
  calls: readonly RecordedCall[],
  stepType: string
): Array<Record<string, unknown>> =>
  calls
    .filter(({ kind, type, failed }) => kind === 'step' && type === stepType && !failed)
    .map(({ input }) => input as Record<string, unknown>);

export type InvestigationState = 'none' | 'open' | `closed: ${string}`;

/** Whether the run opened an investigation, and how it closed it. */
export const investigationState = (calls: readonly RecordedCall[]): InvestigationState => {
  if (succeededStepInputs(calls, 'ai.conversation.create').length === 0) {
    return 'none';
  }
  const closing = succeededStepInputs(calls, 'ai.conversation.metadata.patch')
    .map(({ updates }) => updates as { status?: string; close_reason?: string })
    .find(({ status }) => status === 'closed');
  return closing ? `closed: ${closing.close_reason}` : 'open';
};

/**
 * The calls to a custom step type that send `field` a value other than `expected`,
 * for example a tag step that tags other alerts than the review got. Must be empty.
 */
export const unexpectedValues = (
  runs: Iterable<ManagedWorkflowRun>,
  stepType: string,
  field: string,
  expected: unknown
): string[] => {
  const calls = [...runs].flatMap((run) =>
    run.calls.filter(({ kind, type }) => kind === 'step' && type === stepType)
  );
  if (calls.length === 0) {
    return [`No ${stepType} step ran`];
  }
  return [
    ...new Set(
      calls
        .map(({ stepId, input }) => ({ stepId, value: (input as Record<string, unknown>)[field] }))
        .filter(({ value }) => !isDeepStrictEqual(value, expected))
        .map(({ stepId, value }) => `${stepId} sends ${field}: ${JSON.stringify(value)}`)
    ),
  ];
};

/** The steps that called the proposal workflow, in run order. */
export const proposalSteps = (calls: readonly RecordedCall[]): string[] =>
  calls
    .filter(({ kind, type }) => kind === 'child' && type === PROPOSAL_WORKFLOW_ID)
    .map(({ stepId }) => stepId);

/** What each proposal step sent to the proposal workflow, by step id. */
export const proposalInputs = (
  calls: readonly RecordedCall[]
): Map<string, Record<string, unknown>> =>
  new Map(
    calls
      .filter(({ kind, type }) => kind === 'child' && type === PROPOSAL_WORKFLOW_ID)
      .map(({ stepId, input }) => [stepId, input as Record<string, unknown>])
  );

/**
 * The problems each called workflow finds in the inputs that the runs sent it, empty
 * when every call passes. The engine runs the same check when the called workflow starts.
 */
export const childInputErrors = (runs: Iterable<ManagedWorkflowRun>): string[] => [
  ...new Set(
    [...runs].flatMap(({ calls }) =>
      calls
        .filter(({ kind }) => kind === 'child')
        .flatMap(({ stepId, type, input }) =>
          workflowInputErrors(managedWorkflow(type), input as Record<string, unknown>).map(
            (error) => `${stepId} calls ${type}: ${error}`
          )
        )
    )
  ),
];

/**
 * The problems the action workflow of a proposal step finds in its input, empty when
 * it accepts it. The engine runs the same check when the analyst approves the proposal.
 */
export const actionInputErrors = (calls: readonly RecordedCall[], stepId: string): string[] => {
  const { actionWorkflowId, actionInput } = proposalInputs(calls).get(stepId) ?? {};
  if (typeof actionWorkflowId !== 'string') {
    return [`${stepId} sends no actionWorkflowId`];
  }
  return workflowInputErrors(managedWorkflow(actionWorkflowId), { actionInput });
};

/** The YAML steps that call the proposal workflow. */
export const proposalStepNames = ({ steps }: ParsedWorkflow): string[] =>
  steps
    .filter(
      ({ type, with: stepWith }) =>
        type === 'workflow.execute' && stepWith?.['workflow-id'] === PROPOSAL_WORKFLOW_ID
    )
    .flatMap(({ name }) => (name ? [name] : []));
