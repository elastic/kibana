/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
} from '@kbn/alertzero-common';
import { createWorkerServerContextMock } from '../workers/worker_server_context.mock';
import type { WorkerServerDefinition, WorkerStepDefinition } from '../workers';
import { registerStepDefinitions } from '.';

const registeredIds = (registerStepDefinition: jest.Mock): string[] =>
  registerStepDefinition.mock.calls.map(([definition]) => definition.id);

describe('registerStepDefinitions', () => {
  it('registers the shared steps, then each Worker step built from the shared context', () => {
    const registerStepDefinition = jest.fn();
    const context = createWorkerServerContextMock();
    const workerStep = { id: 'example.step' } as unknown as WorkerStepDefinition;
    const getStepDefinitions = jest.fn(() => [workerStep]);
    const fakeWorkerWithOneStep: WorkerServerDefinition = {
      workerId: SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
      getStepDefinitions,
    };

    registerStepDefinitions({
      workflowsExtensions: { registerStepDefinition },
      context,
      resolveChatModel: jest.fn(),
      readProposals: jest.fn(),
      workers: [
        fakeWorkerWithOneStep,
        { workerId: SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID },
      ],
    });

    expect(getStepDefinitions).toHaveBeenCalledWith(context);
    expect(registeredIds(registerStepDefinition)).toEqual([
      'alertzero.resolveProposals',
      'alertzero.investigation.summarize',
      'example.step',
    ]);
  });

  // The platform registry throws on a duplicate id during setup; this names it before Kibana starts.
  it('registers each step id once across the shared steps and every Worker', () => {
    const registerStepDefinition = jest.fn();

    registerStepDefinitions({
      workflowsExtensions: { registerStepDefinition },
      context: createWorkerServerContextMock(),
      resolveChatModel: jest.fn(),
      readProposals: jest.fn(),
    });

    const ids = registeredIds(registerStepDefinition);
    expect(ids.filter((id, index) => ids.indexOf(id) !== index)).toEqual([]);
  });
});
