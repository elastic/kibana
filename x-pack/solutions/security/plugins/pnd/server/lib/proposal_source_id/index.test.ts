/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsWorkflowStepExecution } from '@kbn/workflows';
import { buildProposalSourceId, buildProposalSourceIdFromStep, parseProposalSourceId } from '.';

describe('buildProposalSourceId', () => {
  it('joins the three parts with colons', () => {
    expect(
      buildProposalSourceId({
        stepExecutionId: 'step-1',
        workflowId: 'system-security-watch-deep',
        workflowRunId: 'run-1',
      })
    ).toEqual('system-security-watch-deep:run-1:step-1');
  });
});

describe('buildProposalSourceIdFromStep', () => {
  it('addresses the step by its execution id', () => {
    const step = {
      id: 'step-exec-9',
      workflowId: 'system-security-watch-deep',
      workflowRunId: 'run-9',
    } as EsWorkflowStepExecution;

    expect(buildProposalSourceIdFromStep(step)).toEqual(
      'system-security-watch-deep:run-9:step-exec-9'
    );
  });

  it('round-trips through parseProposalSourceId', () => {
    const step = {
      id: 'step-exec-9',
      workflowId: 'system-security-watch-deep',
      workflowRunId: 'run-9',
    } as EsWorkflowStepExecution;

    expect(parseProposalSourceId(buildProposalSourceIdFromStep(step))).toEqual({
      stepExecutionId: 'step-exec-9',
      workflowId: 'system-security-watch-deep',
      workflowRunId: 'run-9',
    });
  });
});

describe('parseProposalSourceId', () => {
  it('parses a well-formed source id', () => {
    expect(parseProposalSourceId('wf:run:step')).toEqual({
      stepExecutionId: 'step',
      workflowId: 'wf',
      workflowRunId: 'run',
    });
  });

  it('re-joins a step execution id that contains a colon', () => {
    expect(parseProposalSourceId('wf:run:step:with:colons')).toEqual({
      stepExecutionId: 'step:with:colons',
      workflowId: 'wf',
      workflowRunId: 'run',
    });
  });

  it('returns null when there are fewer than three parts', () => {
    expect(parseProposalSourceId('wf:run')).toBeNull();
  });

  it('returns null when the workflow id is empty', () => {
    expect(parseProposalSourceId(':run:step')).toBeNull();
  });

  it('returns null when the run id is empty', () => {
    expect(parseProposalSourceId('wf::step')).toBeNull();
  });

  it('returns null when the step execution id is empty', () => {
    expect(parseProposalSourceId('wf:run:')).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(parseProposalSourceId('')).toBeNull();
  });
});
