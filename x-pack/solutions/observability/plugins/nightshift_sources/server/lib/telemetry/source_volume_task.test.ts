/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsFindResult } from '@kbn/core/server';
import {
  analyticsServiceMock,
  elasticsearchServiceMock,
  httpServerMock,
  loggingSystemMock,
  savedObjectsRepositoryMock,
} from '@kbn/core/server/mocks';
import { isUnrecoverableError } from '@kbn/task-manager-plugin/server';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import type { NightshiftSourceAttributes } from '../../saved_objects/nightshift_source_saved_object';
import { measureSourceVolume } from './measure_source_volume';
import { SOURCE_VOLUME_EVENT_TYPE } from './source_volume_event';
import {
  registerSourceVolumeTask,
  removeSourceVolumeTask,
  reportSourceVolumes,
  scheduleSourceVolumeTask,
  SOURCE_VOLUME_TASK_ID,
  SOURCE_VOLUME_TASK_TYPE,
  type SourceVolumeTaskDeps,
} from './source_volume_task';

jest.mock('./measure_source_volume');
const measure = jest.mocked(measureSourceVolume);

const source = (
  id: string,
  spaceId: string,
  esql = `FROM logs-${id}-*`,
  enabled = true
): SavedObjectsFindResult<NightshiftSourceAttributes> =>
  ({
    id,
    type: 'nightshift-source',
    namespaces: [spaceId],
    attributes: { enabled, esql, type: 'logs' },
    references: [],
    score: 0,
  } as unknown as SavedObjectsFindResult<NightshiftSourceAttributes>);

const setup = (sources: Array<SavedObjectsFindResult<NightshiftSourceAttributes>>) => {
  const soRepository = savedObjectsRepositoryMock.create();
  soRepository.createPointInTimeFinder.mockReturnValue({
    async *find() {
      yield { saved_objects: sources };
    },
    close: jest.fn(),
  } as never);
  const deps: SourceVolumeTaskDeps = {
    analytics: analyticsServiceMock.createAnalyticsServiceStart(),
    esClient: elasticsearchServiceMock.createElasticsearchClient(),
    meteringEsClient: elasticsearchServiceMock.createElasticsearchClient(),
    soRepository,
    isServerless: false,
    logger: loggingSystemMock.createLogger(),
  };
  return {
    deps,
    soRepository,
    report: (signal = new AbortController().signal) => reportSourceVolumes(deps, signal),
  };
};

const ok = { status: 'ok' as const, has_remote: false, doc_count: 1, bytes_estimated: 10 };

describe('reportSourceVolumes', () => {
  beforeEach(() => {
    measure.mockReset();
  });

  it('reports every configured source across spaces', async () => {
    const { deps, soRepository, report } = setup([
      source('a', 'default'),
      source('b', 'default'),
      source('d', 'marketing', 'FROM logs-d-*', false),
    ]);
    measure.mockImplementation(async ({ esql }) =>
      esql === 'FROM logs-b-*'
        ? { status: 'error', has_remote: false, error: 'verification_exception' }
        : ok
    );

    await report();

    expect(soRepository.createPointInTimeFinder).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'nightshift-source',
        namespaces: ['*'],
        fields: ['enabled', 'esql', 'type'],
      })
    );
    expect(soRepository.createPointInTimeFinder.mock.calls[0][0]).not.toHaveProperty('filter');
    expect(deps.analytics.reportEvent).toHaveBeenCalledWith(SOURCE_VOLUME_EVENT_TYPE, {
      window_start: expect.any(String),
      window_end: expect.any(String),
      sources: [
        {
          space_id: 'default',
          source_id: 'a',
          source_type: 'logs',
          enabled: true,
          ...ok,
        },
        {
          space_id: 'default',
          source_id: 'b',
          source_type: 'logs',
          enabled: true,
          status: 'error',
          has_remote: false,
          error: 'verification_exception',
        },
        {
          space_id: 'marketing',
          source_id: 'd',
          source_type: 'logs',
          enabled: false,
          ...ok,
        },
      ],
    });
  });

  it('sends nothing without configured sources', async () => {
    const { deps, report } = setup([]);
    await report();
    expect(measure).not.toHaveBeenCalled();
    expect(deps.analytics.reportEvent).not.toHaveBeenCalled();
  });

  it('stops paging sources once aborted and closes the point in time', async () => {
    const { deps, soRepository, report } = setup([]);
    const controller = new AbortController();
    const close = jest.fn();
    soRepository.createPointInTimeFinder.mockReturnValue({
      async *find() {
        controller.abort();
        yield { saved_objects: [source('a', 'default')] };
      },
      close,
    } as never);

    await expect(report(controller.signal)).rejects.toThrow();
    expect(close).toHaveBeenCalled();
    expect(measure).not.toHaveBeenCalled();
    expect(deps.analytics.reportEvent).not.toHaveBeenCalled();
  });

  it('stops measuring and sends nothing once the task is aborted', async () => {
    const { deps, report } = setup([source('a', 'default'), source('b', 'default')]);
    const controller = new AbortController();
    measure.mockImplementation(async () => {
      controller.abort();
      return ok;
    });

    await expect(report(controller.signal)).rejects.toThrow();
    expect(deps.analytics.reportEvent).not.toHaveBeenCalled();
  });
});

describe('source volume task credentials', () => {
  it('keeps the recurring task recoverable when its credentials are unavailable', async () => {
    const taskManager = taskManagerMock.createSetup();
    registerSourceVolumeTask({ taskManager, getDeps: jest.fn() });
    const definition =
      taskManager.registerTaskDefinitions.mock.calls[0][0][SOURCE_VOLUME_TASK_TYPE];

    const error = await definition
      .createTaskRunner(taskManagerMock.createRunContext({ fakeRequest: undefined }))
      .run()
      .then(
        () => undefined,
        (runError: Error) => runError
      );

    expect(error).toEqual(
      expect.objectContaining({
        message: 'Source volume telemetry task has no user credentials',
      })
    );
    expect(error && isUnrecoverableError(error)).toBe(false);
  });

  it("uses the task's captured credentials", async () => {
    const taskManager = taskManagerMock.createSetup();
    const request = httpServerMock.createKibanaRequest();
    const { deps } = setup([]);
    const getDeps = jest.fn().mockResolvedValue(deps);
    registerSourceVolumeTask({ taskManager, getDeps });
    const definition =
      taskManager.registerTaskDefinitions.mock.calls[0][0][SOURCE_VOLUME_TASK_TYPE];

    await definition
      .createTaskRunner(taskManagerMock.createRunContext({ fakeRequest: request }))
      .run();

    expect(getDeps).toHaveBeenCalledWith(request);
  });

  it('schedules as the requesting user and refreshes their key on re-enable', async () => {
    const taskManager = taskManagerMock.createStart();
    const request = httpServerMock.createKibanaRequest();

    await scheduleSourceVolumeTask(taskManager, request);

    expect(SOURCE_VOLUME_TASK_ID).toBe('nightshift-sources:source-volume-telemetry');
    expect(taskManager.removeIfExists).toHaveBeenCalledWith(
      'nightshift-sources:source-volume-telemetry:1.0.0'
    );
    expect(taskManager.ensureScheduled).toHaveBeenCalledWith(
      expect.objectContaining({ id: SOURCE_VOLUME_TASK_ID }),
      { request, regenerateApiKey: true }
    );
  });

  it('removes the stable and legacy task documents', async () => {
    const taskManager = taskManagerMock.createStart();

    await removeSourceVolumeTask(taskManager);

    expect(taskManager.removeIfExists).toHaveBeenCalledWith(SOURCE_VOLUME_TASK_ID);
    expect(taskManager.removeIfExists).toHaveBeenCalledWith(
      'nightshift-sources:source-volume-telemetry:1.0.0'
    );
  });
});
