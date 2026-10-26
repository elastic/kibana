/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { ManagedWorkflowStateApi } from '@kbn/workflows/server/types';
import { checkWorkflowManaged } from './check_workflow_managed';
const STATE = {
  definitionId: 'wf-review',
  documentVersion: 1,
  spaceId: '*',
  templateValues: null,
  workflowId: 'wf-review',
};

const createState = (
  getInstalledWorkflowState: ManagedWorkflowStateApi['getInstalledWorkflowState']
): ManagedWorkflowStateApi => ({
  getInstalledWorkflowState: jest.fn(getInstalledWorkflowState),
  listInstalledWorkflowStates: jest.fn(),
});

const check = (
  state: ManagedWorkflowStateApi | undefined,
  spaceId = 'default',
  serviceAccountsEnabled = true
) =>
  checkWorkflowManaged({
    abortSignal: new AbortController().signal,
    areServiceAccountsEnabled: () => serviceAccountsEnabled,
    getManagedWorkflowState: async () => state,
    hopTimeoutMs: 5000,
    logger: loggingSystemMock.createLogger(),
    spaceId,
    workflowId: 'wf-review',
  });

describe('checkWorkflowManaged', () => {
  it('accepts a workflow AlertZero installed in the execution space', async () => {
    expect(await check(createState(async () => STATE))).toBeUndefined();
  });

  it('accepts a global workflow AlertZero installed', async () => {
    const state = createState(async (_id, spaceId) => (spaceId === '*' ? STATE : null));

    expect(await check(state)).toBeUndefined();
  });

  it('does not repeat the lookup when the execution space is the global space', async () => {
    const state = createState(async () => null);

    await check(state, '*');

    expect(state.getInstalledWorkflowState).toHaveBeenCalledTimes(1);
  });

  it('rejects a workflow AlertZero does not own in either space', async () => {
    expect(await check(createState(async () => null))).toBe('not_managed');
  });

  it('cannot verify without the managed workflows client', async () => {
    expect(await check(undefined)).toBe('lineage_unavailable');
  });

  it('says service accounts are off when that is why there is no managed workflows client', async () => {
    expect(await check(undefined, 'default', false)).toBe('service_accounts_disabled');
  });

  it('cannot verify when the lookup throws', async () => {
    const state = createState(async () => {
      throw new Error('Workflows is not available in this environment');
    });

    expect(await check(state)).toBe('lineage_unavailable');
  });

  it('logs why the lookup failed, at debug', async () => {
    const logger = loggingSystemMock.createLogger();
    const state = createState(async () => {
      throw new Error('Workflows is not available in this environment');
    });

    await checkWorkflowManaged({
      abortSignal: new AbortController().signal,
      areServiceAccountsEnabled: () => true,
      getManagedWorkflowState: async () => state,
      hopTimeoutMs: 5000,
      logger,
      spaceId: 'default',
      workflowId: 'wf-review',
    });

    const messages = (logger.debug as jest.Mock).mock.calls.map(([message]) =>
      typeof message === 'function' ? message() : message
    );
    expect(messages).toEqual([
      'Could not check that wf-review is managed: Error: Workflows is not available in this environment',
    ]);
  });

  it('reads nothing once the signal has aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    const state = createState(async () => STATE);

    const result = await checkWorkflowManaged({
      abortSignal: controller.signal,
      areServiceAccountsEnabled: () => true,
      getManagedWorkflowState: async () => state,
      hopTimeoutMs: 5000,
      logger: loggingSystemMock.createLogger(),
      spaceId: 'default',
      workflowId: 'wf-review',
    });

    expect({ result, reads: (state.getInstalledWorkflowState as jest.Mock).mock.calls }).toEqual({
      reads: [],
      result: 'aborted',
    });
  });

  it('cannot verify when the lookup outlives the timeout', async () => {
    const state = createState(() => new Promise(() => {}));

    const result = await checkWorkflowManaged({
      abortSignal: new AbortController().signal,
      areServiceAccountsEnabled: () => true,
      getManagedWorkflowState: async () => state,
      hopTimeoutMs: 1,
      logger: loggingSystemMock.createLogger(),
      spaceId: 'default',
      workflowId: 'wf-review',
    });

    expect(result).toBe('lineage_unavailable');
  });
});
