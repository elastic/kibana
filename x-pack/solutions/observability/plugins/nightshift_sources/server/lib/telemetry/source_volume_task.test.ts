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
  loggingSystemMock,
  savedObjectsRepositoryMock,
} from '@kbn/core/server/mocks';
import type { NightshiftSourceAttributes } from '../../saved_objects/nightshift_source_saved_object';
import { measureSourceVolume } from './measure_source_volume';
import { SOURCE_VOLUME_EVENT_TYPE } from './source_volume_event';
import { reportSourceVolumes, type SourceVolumeTaskDeps } from './source_volume_task';

jest.mock('./measure_source_volume');
const measure = jest.mocked(measureSourceVolume);

const source = (
  id: string,
  spaceId: string,
  esql = `FROM logs-${id}-*`
): SavedObjectsFindResult<NightshiftSourceAttributes> =>
  ({
    id,
    type: 'nightshift-source',
    namespaces: [spaceId],
    attributes: { esql, type: 'logs' },
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
    soRepository,
    isServerless: false,
    cpsEnabled: false,
    logger: loggingSystemMock.createLogger(),
  };
  return {
    deps,
    report: (signal = new AbortController().signal) => reportSourceVolumes(deps, signal),
  };
};

const ok = { status: 'ok' as const, has_remote: false, doc_count: 1, bytes_estimated: 10 };

describe('reportSourceVolumes', () => {
  beforeEach(() => {
    measure.mockReset();
  });

  it('sends one event with every enabled source of every space, failures included', async () => {
    const { deps, report } = setup([
      source('a', 'default'),
      source('b', 'default'),
      source('c', 'marketing'),
    ]);
    measure.mockImplementation(async ({ esql }) =>
      esql === 'FROM logs-b-*'
        ? { status: 'error', has_remote: false, error: 'verification_exception' }
        : ok
    );

    await report();

    expect(deps.soRepository.createPointInTimeFinder).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'nightshift-source',
        namespaces: ['*'],
        filter: 'nightshift-source.attributes.enabled: true',
      })
    );
    expect(deps.analytics.reportEvent).toHaveBeenCalledTimes(1);
    expect(deps.analytics.reportEvent).toHaveBeenCalledWith(SOURCE_VOLUME_EVENT_TYPE, {
      window_start: expect.any(String),
      window_end: expect.any(String),
      sources: [
        { space_id: 'default', source_id: 'a', source_type: 'logs', ...ok },
        {
          space_id: 'default',
          source_id: 'b',
          source_type: 'logs',
          status: 'error',
          has_remote: false,
          error: 'verification_exception',
        },
        { space_id: 'marketing', source_id: 'c', source_type: 'logs', ...ok },
      ],
    });
  });

  it('sends nothing without enabled sources', async () => {
    const { deps, report } = setup([]);
    await report();
    expect(measure).not.toHaveBeenCalled();
    expect(deps.analytics.reportEvent).not.toHaveBeenCalled();
  });

  it('stops paging sources once aborted and closes the point in time', async () => {
    const { deps, report } = setup([]);
    const controller = new AbortController();
    const close = jest.fn();
    deps.soRepository.createPointInTimeFinder.mockReturnValue({
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
