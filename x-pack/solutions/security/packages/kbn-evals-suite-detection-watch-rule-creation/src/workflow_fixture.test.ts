/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';
import { getManagedWorkflowDefinition } from '@kbn/workflows/managed';
import { DRAFT_STEP_ID, PROPOSE_STEP_ID, RULE_CREATION_WORKFLOW_ID } from './constants';
import { REQUIRED_STEP_IDS, assertWorkflowInstalled } from './workflow_fixture';

const log = { info: jest.fn(), debug: jest.fn(), warning: jest.fn() } as unknown as ToolingLog;

const shippedYaml = (): string => {
  const definition = getManagedWorkflowDefinition(RULE_CREATION_WORKFLOW_ID);
  if (!definition?.yaml) {
    throw new Error(`${RULE_CREATION_WORKFLOW_ID} is not a managed workflow with yaml`);
  }
  return definition.yaml;
};

const fetchReturning = (yaml: string) => jest.fn(async () => ({ yaml })) as unknown as HttpHandler;

describe('rule-creation workflow contract', () => {
  it('addresses steps that the shipped managed workflow declares', async () => {
    await expect(
      assertWorkflowInstalled({
        fetch: fetchReturning(shippedYaml()),
        log,
      })
    ).resolves.toBeDefined();
  });

  it('pins the draft and proposal steps by id', () => {
    expect([...REQUIRED_STEP_IDS]).toEqual([DRAFT_STEP_ID, PROPOSE_STEP_ID]);
  });

  it('fails setup when a required step is renamed in the workflow', async () => {
    const renamed = shippedYaml().replace(`- name: ${PROPOSE_STEP_ID}`, '- name: some_other_step');
    await expect(assertWorkflowInstalled({ fetch: fetchReturning(renamed), log })).rejects.toThrow(
      PROPOSE_STEP_ID
    );
  });
});
