/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ListResponse } from '@kbn/entity-inventory-plugin/common';
import {
  PROBES_FIXTURE,
  QUERIES_FIXTURE,
  TIMINGS_FIXTURE,
} from '../application/performance_overlay/__fixtures__/list_diagnostics';
import { createPerformanceRecorder } from '../application/performance_overlay/performance_recorder';
import { TYPES_RESPONSE_FIXTURE } from '../__fixtures__/inventory_data';
import type { EntityInventoryApiClient } from './client';
import { withPerformanceRecording } from './with_performance_recording';

const LIST_RESPONSE: ListResponse = {
  columns: [{ name: 'entity.id', kind: 'id' }],
  rows: [{ 'entity.id': 'host:a' }, { 'entity.id': 'host:b' }],
  provenance: {},
  truncated: true,
  queries: QUERIES_FIXTURE,
  probes: PROBES_FIXTURE,
  timings: TIMINGS_FIXTURE,
  unavailableColumns: [{ column: 'os', indexPattern: 'logs-*', field: 'host.os.name' }],
};

const REQUEST = { from: '2026-11-19T10:00:00.000Z', to: '2026-11-19T10:15:00.000Z' };

const setup = (recording: { enabled: boolean }) => {
  const client: jest.Mocked<EntityInventoryApiClient> = {
    getTypes: jest.fn().mockResolvedValue(TYPES_RESPONSE_FIXTURE),
    getEntities: jest.fn().mockResolvedValue(LIST_RESPONSE),
  };
  const recorder = createPerformanceRecorder();
  const instrumented = withPerformanceRecording(client, recorder, () => recording.enabled);
  return { client, recorder, instrumented };
};

describe('withPerformanceRecording', () => {
  it('returns the client promise itself and records nothing while not recording', () => {
    const { client, recorder, instrumented } = setup({ enabled: false });

    const types = instrumented.getTypes({});
    const list = instrumented.getEntities('host', REQUEST, {});

    expect(types).toBe(client.getTypes.mock.results[0].value);
    expect(list).toBe(client.getEntities.mock.results[0].value);
    expect(recorder.getCalls()).toEqual([]);
  });

  it('records a _list call with its server diagnostics and without its rows', async () => {
    const { client, recorder, instrumented } = setup({ enabled: true });
    const options = { signal: new AbortController().signal };

    await expect(instrumented.getEntities('host', REQUEST, options)).resolves.toBe(LIST_RESPONSE);

    expect(client.getEntities).toHaveBeenCalledWith('host', REQUEST, options);
    const [recorded] = recorder.getCalls();
    expect(recorded).toEqual(
      expect.objectContaining({
        route: 'host/_list',
        status: 'ok',
        serverMs: TIMINGS_FIXTURE.totalMs,
        errorMessage: null,
        list: {
          queries: QUERIES_FIXTURE,
          probes: PROBES_FIXTURE,
          timings: TIMINGS_FIXTURE,
          truncated: true,
          unavailableColumns: LIST_RESPONSE.unavailableColumns,
          rowCount: 2,
        },
      })
    );
    expect(recorded.browserMs).toBeGreaterThanOrEqual(0);
  });

  it('records a types call with browser time only', async () => {
    const { recorder, instrumented } = setup({ enabled: true });

    await instrumented.getTypes({});

    expect(recorder.getCalls()).toEqual([
      expect.objectContaining({ route: 'types', status: 'ok', serverMs: null, list: null }),
    ]);
  });

  it('records a failed call as an error and rethrows it', async () => {
    const { client, recorder, instrumented } = setup({ enabled: true });
    const error = new Error('Bad request');
    client.getEntities.mockRejectedValue(error);

    await expect(instrumented.getEntities('host', REQUEST, {})).rejects.toBe(error);

    expect(recorder.getCalls()).toEqual([
      expect.objectContaining({ status: 'error', errorMessage: 'Bad request', list: null }),
    ]);
  });

  it('records a call rejected after its signal aborted as aborted', async () => {
    const { client, recorder, instrumented } = setup({ enabled: true });
    const controller = new AbortController();
    client.getEntities.mockImplementation(async () => {
      controller.abort();
      throw new Error('The request was aborted');
    });

    await expect(
      instrumented.getEntities('host', REQUEST, { signal: controller.signal })
    ).rejects.toThrow('The request was aborted');

    expect(recorder.getCalls()).toEqual([expect.objectContaining({ status: 'aborted' })]);
  });

  it('follows the recording switch from one call to the next', async () => {
    const recording = { enabled: false };
    const { recorder, instrumented } = setup(recording);

    await instrumented.getTypes({});
    recording.enabled = true;
    await instrumented.getTypes({});
    recording.enabled = false;
    await instrumented.getTypes({});

    expect(recorder.getCalls()).toHaveLength(1);
  });
});
