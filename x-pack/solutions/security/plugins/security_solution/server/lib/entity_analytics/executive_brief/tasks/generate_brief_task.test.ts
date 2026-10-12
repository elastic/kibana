/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock, httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { ConcreteTaskInstance } from '@kbn/task-manager-plugin/server';
import { TaskCost, TaskPriority } from '@kbn/task-manager-plugin/server';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import type { AuthenticatedUser } from '@kbn/core/server';
import {
  BRIEF_RETENTION_MS,
  EXECUTIVE_BRIEF_GENERATE_TASK_TYPE,
} from '../../../../../common/entity_analytics/executive_brief/constants';
import type { BriefStore } from '../store/brief_store';
import { runBrief } from '../pipeline/run_brief';
import type { RunBriefDeps } from '../pipeline/run_brief';
import {
  createGenerateBriefTaskRunner,
  registerGenerateBriefTask,
  scheduleGenerateBriefTask,
} from './generate_brief_task';
import type { GenerateBriefTaskDeps, GenerateBriefTaskParams } from './generate_brief_task';

// The plugin's jest moduleNameMapper replaces this module with a stub that only has TaskStatus.
jest.mock('@kbn/task-manager-plugin/server', () => {
  const task = jest.requireActual('@kbn/task-manager-plugin/server/task');
  const taskErrors = jest.requireActual('@kbn/task-manager-plugin/server/task_running/errors');
  return {
    TaskCost: task.TaskCost,
    TaskPriority: task.TaskPriority,
    TaskStatus: task.TaskStatus,
    throwUnrecoverableError: taskErrors.throwUnrecoverableError,
  };
});

jest.mock('../composition/compose_verified_brief', () => ({ composeVerifiedBrief: jest.fn() }));
jest.mock('../signals', () => ({ BRIEF_SIGNALS: [] }));
jest.mock('../signals/run_signals', () => ({ runSignals: jest.fn() }));
jest.mock('../pipeline/run_brief', () => {
  const actual = jest.requireActual('../pipeline/run_brief');
  return { ...actual, runBrief: jest.fn().mockResolvedValue({ status: 'succeeded' }) };
});

const runBriefMock = jest.mocked(runBrief);

const params: GenerateBriefTaskParams = {
  docId: 'doc',
  jobId: 'job',
  spaceId: 'default',
  range: '7d',
  from: '2026-10-05T10:00:00.000Z',
  to: '2026-10-12T10:00:00.000Z',
  connectorId: 'c1',
};

const taskInstance = { id: 'task', params, state: {} } as unknown as ConcreteTaskInstance;

const storedDocument = {
  docId: 'doc',
  seqNo: 1,
  primaryTerm: 1,
  document: {
    schema_version: 1 as const,
    owner: { id: 'u_alice', username: 'alice' },
    space_id: 'default',
    job: { id: 'job', status: 'pending' as const, started_at: params.to },
    expires_at: new Date(Date.parse(params.to) + BRIEF_RETENTION_MS).toISOString(),
  },
};

describe('generate brief task', () => {
  const logger = loggingSystemMock.createLogger();
  let store: { getForJob: jest.Mock; failJob: jest.Mock };
  let coreStart: ReturnType<typeof coreMock.createStart>;
  let inference: { getClient: jest.Mock };
  let cases: { getCasesClientWithRequest: jest.Mock };
  let deps: GenerateBriefTaskDeps;
  const runBriefDeps = {} as RunBriefDeps;

  beforeEach(() => {
    jest.clearAllMocks();
    store = {
      getForJob: jest.fn().mockResolvedValue(storedDocument),
      failJob: jest.fn().mockResolvedValue(true),
    };
    coreStart = coreMock.createStart();
    jest.mocked(coreStart.security.authc.getCurrentUser).mockReturnValue({
      username: 'alice',
      profile_uid: 'u_alice',
    } as unknown as AuthenticatedUser);
    inference = { getClient: jest.fn().mockReturnValue({ bound: true }) };
    cases = { getCasesClientWithRequest: jest.fn().mockResolvedValue({ cases: true }) };
    deps = {
      getStartServices: jest.fn().mockResolvedValue([coreStart, { inference, cases }, {}]),
      getBriefStore: async () => store as unknown as BriefStore,
      logger,
      runBriefDeps,
    };
  });

  it('registers a one-shot, user-interactive, large task', () => {
    const taskManager = taskManagerMock.createSetup();
    registerGenerateBriefTask({ taskManager, ...deps });

    const definition =
      taskManager.registerTaskDefinitions.mock.calls[0][0][EXECUTIVE_BRIEF_GENERATE_TASK_TYPE];
    expect(definition).toEqual(
      expect.objectContaining({
        maxAttempts: 1,
        timeout: '5m',
        priority: TaskPriority.UserInteractive,
        cost: TaskCost.Large,
      })
    );
    expect(() => definition.paramsSchema?.validate(params)).not.toThrow();
    expect(() => definition.paramsSchema?.validate({ ...params, range: '1y' })).toThrow();
  });

  it('runs the brief as the task user with a bound inference client', async () => {
    const fakeRequest = httpServerMock.createKibanaRequest();
    const runner = createGenerateBriefTaskRunner(
      { taskInstance, fakeRequest, signal: new AbortController().signal },
      deps
    );

    expect(await runner.run()).toEqual({ state: {} });

    expect(inference.getClient).toHaveBeenCalledWith({
      request: fakeRequest,
      bindTo: { connectorId: 'c1' },
    });
    expect(coreStart.elasticsearch.client.asScoped).toHaveBeenCalledWith(fakeRequest);
    const [runParams] = runBriefMock.mock.calls[0];
    expect(runParams).toEqual(
      expect.objectContaining({
        docId: 'doc',
        jobId: 'job',
        params: { range: '7d', from: params.from, to: params.to, connector_id: 'c1' },
        inferenceClient: { bound: true },
        deps: runBriefDeps,
      })
    );
    expect(runParams.signalContext).toEqual(
      expect.objectContaining({
        spaceId: 'default',
        timeRange: { from: params.from, to: params.to },
        user: { username: 'alice', profileUid: 'u_alice' },
      })
    );
    expect(await runParams.signalContext.getCasesClient()).toEqual({ cases: true });
    expect(cases.getCasesClientWithRequest).toHaveBeenCalledWith(fakeRequest);
  });

  it('skips a job that is no longer current', async () => {
    store.getForJob.mockResolvedValue(undefined);
    const runner = createGenerateBriefTaskRunner(
      {
        taskInstance,
        fakeRequest: httpServerMock.createKibanaRequest(),
        signal: new AbortController().signal,
      },
      deps
    );

    await runner.run();
    expect(runBriefMock).not.toHaveBeenCalled();
  });

  it('fails the job and throws without a fake request', async () => {
    const runner = createGenerateBriefTaskRunner(
      { taskInstance, fakeRequest: undefined, signal: new AbortController().signal },
      deps
    );

    await expect(runner.run()).rejects.toThrow(/missing API key/);
    expect(store.failJob).toHaveBeenCalledWith(
      expect.objectContaining({ docId: 'doc', jobId: 'job' })
    );
    expect(runBriefMock).not.toHaveBeenCalled();
  });

  it('aborts the run and records the failure on cancel', async () => {
    const taskSignal = new AbortController();
    const runner = createGenerateBriefTaskRunner(
      {
        taskInstance,
        fakeRequest: httpServerMock.createKibanaRequest(),
        signal: taskSignal.signal,
      },
      deps
    );
    await runner.run();
    const [{ abortSignal }] = runBriefMock.mock.calls[0];

    taskSignal.abort();
    await runner.cancel();

    expect(abortSignal.aborted).toBe(true);
    expect(store.failJob).toHaveBeenCalledWith(
      expect.objectContaining({
        docId: 'doc',
        jobId: 'job',
        error: expect.objectContaining({ code: 'interrupted' }),
      })
    );
  });

  it('schedules the task as the user and requests an immediate claim', async () => {
    const taskManager = taskManagerMock.createStart();
    const request = httpServerMock.createKibanaRequest();

    const id = await scheduleGenerateBriefTask({ taskManager, request, params, logger });

    expect(id).toBe(`${EXECUTIVE_BRIEF_GENERATE_TASK_TYPE}:job`);
    expect(taskManager.schedule).toHaveBeenCalledWith(
      { id, taskType: EXECUTIVE_BRIEF_GENERATE_TASK_TYPE, params, state: {} },
      { request, cloneApiKey: true }
    );
    await new Promise(process.nextTick);
    expect(taskManager.runSoon).toHaveBeenCalledWith(id, { requestImmediateClaim: true });
  });
});
