/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse } from 'yaml';
import { CREATE_PROPOSAL_WORKFLOW_ID, getManagedWorkflowDefinitions } from '@kbn/workflows/managed';
import type { ManagedWorkflowDefinition } from '@kbn/workflows/managed';
import { ALERTZERO_PROPOSAL_ORIGIN } from '../../../common/proposals/origin';

/**
 * `origin` is the routing key the queue filters on by exact equality, so an
 * AlertZero Worker that declares someone else's — easy on a copy-paste, and
 * still a valid enum member — produces proposals no AlertZero analyst ever
 * sees. The enum cannot catch that; only comparing each call site against the
 * value this solution owns can.
 *
 * Swept across every AlertZero definition rather than naming call sites, so a
 * new Worker cannot be added without one.
 */

/** The plugin id AlertZero's managed workflow definitions are registered under. */
const ALERTZERO_PLUGIN_ID = 'alertzero';

interface WorkflowStep {
  name?: string;
  with?: { 'workflow-id'?: string; inputs?: Record<string, unknown> };
  steps?: WorkflowStep[];
  cases?: Array<{ steps?: WorkflowStep[] }>;
  default?: WorkflowStep[];
}

interface ParsedWorkflow {
  steps?: WorkflowStep[];
}

/** Flattens the nesting a `switch` introduces alongside the ordinary `steps`. */
const flatten = (steps: WorkflowStep[]): WorkflowStep[] =>
  steps.flatMap((step) => [
    step,
    ...flatten(step.steps ?? []),
    ...flatten((step.cases ?? []).flatMap((branch) => branch.steps ?? [])),
    ...flatten(step.default ?? []),
  ]);

/**
 * Templating here is placeholder substitution, so any plausible scalar renders
 * a parseable document. A template needing a key this lacks throws, which is
 * the right outcome: it means a definition escaped the sweep.
 */
const TEMPLATE_VALUES = {
  settingsVersion: 1,
  autonomyLevel: 'manual',
  scheduleInterval: '1h',
  extras: { analysisWindowDays: 7 },
};

const alertzeroDefinitions: ManagedWorkflowDefinition[] = getManagedWorkflowDefinitions().filter(
  (definition) => definition.pluginId === ALERTZERO_PLUGIN_ID
);

const proposalCallSites = alertzeroDefinitions.flatMap((definition) => {
  const yaml = definition.yaml ?? definition.yamlTemplate(TEMPLATE_VALUES);
  const workflow = parse(yaml) as ParsedWorkflow;

  return flatten(workflow.steps ?? [])
    .filter((step) => step.with?.['workflow-id'] === CREATE_PROPOSAL_WORKFLOW_ID)
    .map((step) => ({
      id: `${definition.id} › ${step.name ?? '(unnamed)'}`,
      inputs: step.with?.inputs ?? {},
    }));
});

describe('AlertZero proposal origin', () => {
  it('finds the call sites it is meant to be pinning', () => {
    expect(proposalCallSites.length).toBeGreaterThan(0);
  });

  it.each(proposalCallSites.map(({ id, inputs }) => [id, inputs]))(
    '%s stamps the AlertZero origin',
    (_id, inputs) => {
      expect(inputs.origin).toBe(ALERTZERO_PROPOSAL_ORIGIN);
    }
  );
});
