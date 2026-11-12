/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import {
  elasticsearchServiceMock,
  httpServerMock,
  loggingSystemMock,
} from '@kbn/core/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import {
  SESSIONS_INDEX,
  SESSIONS_INDEX_TEMPLATE_NAME,
  SESSIONS_TASK_ID,
  SESSIONS_TASK_TYPE,
} from '../../../common/sessions';
import {
  NO_ENCRYPTION_KEY_MESSAGE,
  SessionsEnableError,
  enableSessions,
  type SessionsEnableStep,
} from './enable_sessions';
import { checkSessionsPrivileges } from './sessions_privileges';
import { SessionsPrivilegesError } from './sessions_privileges_error';

jest.mock('./sessions_privileges');

type ScopedClient = ReturnType<typeof elasticsearchServiceMock.createScopedClusterClient>;
type TaskManager = ReturnType<typeof taskManagerMock.createStart>;

const settings = { frequency: '1m', concurrency: 2 };

const esError = (statusCode: number, type: string) =>
  new errors.ResponseError({
    statusCode,
    body: { error: { type } },
    headers: {},
    warnings: null,
    meta: {} as never,
  });

describe('enableSessions', () => {
  let esClient: ScopedClient;
  let taskManager: TaskManager;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  const request = httpServerMock.createKibanaRequest();

  const enable = ({ canEncrypt = true }: { canEncrypt?: boolean } = {}) =>
    enableSessions({
      esClient,
      request,
      taskManager,
      canEncrypt,
      settings,
      isServerless: true,
      logger,
    });

  const enableError = async (options?: { canEncrypt?: boolean }) =>
    enable(options).then(
      () => {
        throw new Error('expected enabling to fail');
      },
      (error) => error
    );

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createScopedClusterClient();
    taskManager = taskManagerMock.createStart();
    logger = loggingSystemMock.createLogger();
    jest.mocked(checkSessionsPrivileges).mockResolvedValue();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('puts the template, creates the index, schedules the task and runs it right away', async () => {
    await enable();

    expect(checkSessionsPrivileges).toHaveBeenCalledWith(esClient.asCurrentUser, {
      isServerless: true,
    });
    // Kibana owns the template; the index is the user's, like the summaries the task writes.
    expect(esClient.asInternalUser.indices.putIndexTemplate).toHaveBeenCalledWith(
      expect.objectContaining({ name: SESSIONS_INDEX_TEMPLATE_NAME }),
      expect.anything()
    );
    expect(esClient.asCurrentUser.indices.putIndexTemplate).not.toHaveBeenCalled();
    expect(esClient.asCurrentUser.indices.create).toHaveBeenCalledWith(
      { index: SESSIONS_INDEX },
      expect.anything()
    );
    expect(esClient.asInternalUser.indices.create).not.toHaveBeenCalled();
    expect(taskManager.ensureScheduled).toHaveBeenCalledWith(
      expect.objectContaining({
        id: SESSIONS_TASK_ID,
        taskType: SESSIONS_TASK_TYPE,
        schedule: { interval: '1m' },
      }),
      { request, regenerateApiKey: true, includeRunningTasks: true }
    );
    expect(taskManager.runSoon).toHaveBeenCalledWith(SESSIONS_TASK_ID);
  });

  it('checks the privileges first, then runs the steps in order', async () => {
    await enable();

    const order = [
      jest.mocked(checkSessionsPrivileges),
      esClient.asInternalUser.indices.putIndexTemplate,
      esClient.asCurrentUser.indices.create,
      taskManager.ensureScheduled,
      taskManager.runSoon,
    ].map((fn) => fn.mock.invocationCallOrder[0]);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it('changes nothing for a user who may not set sessions up', async () => {
    const refused = new SessionsPrivilegesError(['index:logs-*.otel-*:read']);
    jest.mocked(checkSessionsPrivileges).mockRejectedValue(refused);

    expect(await enableError()).toBe(refused);
    expect(esClient.asInternalUser.indices.putIndexTemplate).not.toHaveBeenCalled();
    expect(esClient.asCurrentUser.indices.create).not.toHaveBeenCalled();
    expect(taskManager.ensureScheduled).not.toHaveBeenCalled();
  });

  it('fails at the credentials step when Kibana cannot store the API key', async () => {
    const error = await enableError({ canEncrypt: false });

    expect(error).toBeInstanceOf(SessionsEnableError);
    expect(error.step).toBe('credentials');
    expect(error.message).toContain(NO_ENCRYPTION_KEY_MESSAGE);
    expect(esClient.asInternalUser.indices.putIndexTemplate).not.toHaveBeenCalled();
    expect(taskManager.ensureScheduled).not.toHaveBeenCalled();
  });

  it('keeps an existing index', async () => {
    esClient.asCurrentUser.indices.create.mockRejectedValue(
      esError(400, 'resource_already_exists_exception')
    );

    await expect(enable()).resolves.toBeUndefined();
    expect(taskManager.ensureScheduled).toHaveBeenCalled();
  });

  describe.each<[SessionsEnableStep, (cause: Error) => void]>([
    [
      'template',
      (cause) => esClient.asInternalUser.indices.putIndexTemplate.mockRejectedValue(cause),
    ],
    ['index', (cause) => esClient.asCurrentUser.indices.create.mockRejectedValue(cause)],
    ['task', (cause) => taskManager.ensureScheduled.mockRejectedValue(cause)],
  ])('when the %s step fails', (step, fail) => {
    const cause = esError(403, 'security_exception');

    it('names the step and keeps the cause', async () => {
      fail(cause);

      const error = await enableError();

      expect(error).toBeInstanceOf(SessionsEnableError);
      expect(error.step).toBe(step);
      expect(error.cause).toBe(cause);
      expect(error.message).toBe(`Enabling sessions failed at the ${step} step: ${cause.message}`);
    });

    it('stops before the later steps', async () => {
      fail(cause);

      await enableError();

      const steps: Record<SessionsEnableStep, boolean> = {
        credentials: true,
        template: esClient.asInternalUser.indices.putIndexTemplate.mock.calls.length > 0,
        index: esClient.asCurrentUser.indices.create.mock.calls.length > 0,
        task: taskManager.ensureScheduled.mock.calls.length > 0,
      };
      const attempted = (Object.keys(steps) as SessionsEnableStep[]).filter((name) => steps[name]);
      expect(attempted.at(-1)).toBe(step);
      expect(taskManager.runSoon).not.toHaveBeenCalled();
    });
  });

  it('enables sessions even when the task cannot run right away', async () => {
    taskManager.runSoon.mockRejectedValue(new Error('task is already running'));

    await expect(enable()).resolves.toBeUndefined();
    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('task is already running'));
  });
});
