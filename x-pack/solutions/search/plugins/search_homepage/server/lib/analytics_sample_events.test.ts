/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import {
  SAMPLE_EVENTS_MAX_AGE_MS,
  SampleEventsInstallError,
  installSampleEvents,
  removeSampleEvents,
} from './analytics_sample_events';
import { SAMPLE_EVENTS_MAPPINGS, generateSampleEvents } from './analytics_sample_events_generator';

const INDEX = 'kibana_sample_data_clickstream';
const NOW = Date.parse('2026-11-19T10:00:00.000Z');
const EVENTS = generateSampleEvents({ now: NOW });

const COLUMNAR_SETTINGS = { mode: 'columnar', sort: { field: ['@timestamp'], order: ['desc'] } };

const esError = (statusCode: number, type = 'exception'): Error =>
  Object.assign(new Error(type), { statusCode, body: { error: { type } } });

describe('sample events', () => {
  let client: ReturnType<typeof elasticsearchServiceMock.createScopedClusterClient>;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  const mockInstalled = (count: number, latestEventTime: number | null): void => {
    client.asCurrentUser.search.mockResponse({
      took: 1,
      timed_out: false,
      _shards: { total: 1, successful: 1, failed: 0 },
      hits: { total: { value: count, relation: 'eq' }, hits: [] },
      aggregations: { latest: { value: latestEventTime } },
    });
  };
  const mockIndexMode = (mode?: string): void => {
    client.asCurrentUser.indices.getSettings.mockResponse({
      [INDEX]: { settings: mode === undefined ? {} : { index: { mode } } },
    });
  };
  const mockNotInstalled = (): void => {
    client.asCurrentUser.search.mockRejectedValue(esError(404, 'index_not_found_exception'));
  };
  const mockBulkAccepted = (): void => {
    client.asCurrentUser.bulk.mockResponse({ took: 1, errors: false, items: [] });
  };
  const install = (isServerless = false) =>
    installSampleEvents({ client, logger, isServerless, now: NOW });

  beforeEach(() => {
    client = elasticsearchServiceMock.createScopedClusterClient();
    logger = loggingSystemMock.createLogger();
  });

  describe('installSampleEvents', () => {
    it('creates the index with explicit mappings and indexes every event as the caller', async () => {
      mockNotInstalled();
      mockBulkAccepted();

      await expect(install()).resolves.toEqual({
        index: INDEX,
        eventsCount: EVENTS.length,
        status: 'installed',
      });

      expect(client.asCurrentUser.indices.delete).not.toHaveBeenCalled();
      expect(client.asCurrentUser.indices.create).toHaveBeenCalledWith(
        expect.objectContaining({ index: INDEX, mappings: SAMPLE_EVENTS_MAPPINGS })
      );
      expect(client.asCurrentUser.indices.create.mock.calls[0][0]).toHaveProperty('settings', {
        index: { ...COLUMNAR_SETTINGS, number_of_shards: 1, auto_expand_replicas: '0-1' },
      });

      const bulkCalls = client.asCurrentUser.bulk.mock.calls.map(([request]) => request);
      const operations = bulkCalls.flatMap(({ operations: chunk = [] }) => chunk);
      expect(bulkCalls.every(({ index }) => index === INDEX)).toBe(true);
      expect(bulkCalls.map(({ refresh }) => refresh)).toEqual([false, false, false, true]);
      expect(operations.filter((_, position) => position % 2 === 1)).toEqual(EVENTS);
      expect(operations.filter((_, position) => position % 2 === 0)).toEqual(
        EVENTS.map((_, position) => ({ index: { _id: String(position) } }))
      );
      expect(client.asInternalUser.bulk).not.toHaveBeenCalled();
      expect(client.asInternalUser.indices.create).not.toHaveBeenCalled();
    });

    it('sends no shard or replica settings to serverless Elasticsearch, which rejects them', async () => {
      mockNotInstalled();
      mockBulkAccepted();

      await expect(install(true)).resolves.toMatchObject({ status: 'installed' });

      expect(client.asCurrentUser.indices.create).toHaveBeenCalledWith({
        index: INDEX,
        settings: { index: COLUMNAR_SETTINGS },
        mappings: SAMPLE_EVENTS_MAPPINGS,
      });
    });

    it('leaves complete, recent events in a columnar index untouched', async () => {
      mockInstalled(EVENTS.length, NOW - SAMPLE_EVENTS_MAX_AGE_MS);
      mockIndexMode('columnar');

      await expect(install()).resolves.toEqual({
        index: INDEX,
        eventsCount: EVENTS.length,
        status: 'alreadyInstalled',
      });

      expect(client.asCurrentUser.indices.delete).not.toHaveBeenCalled();
      expect(client.asCurrentUser.indices.create).not.toHaveBeenCalled();
      expect(client.asCurrentUser.bulk).not.toHaveBeenCalled();
    });

    it.each([
      ['incomplete', EVENTS.length - 1, NOW],
      ['outdated', EVENTS.length, NOW - SAMPLE_EVENTS_MAX_AGE_MS - 1],
      ['empty', 0, null],
    ])('replaces %s events', async (_, count, latestEventTime) => {
      mockInstalled(count, latestEventTime);
      mockBulkAccepted();

      await expect(install()).resolves.toEqual({
        index: INDEX,
        eventsCount: EVENTS.length,
        status: 'replaced',
      });

      expect(client.asCurrentUser.indices.delete).toHaveBeenCalledWith({ index: INDEX });
      expect(client.asCurrentUser.indices.delete.mock.invocationCallOrder[0]).toBeLessThan(
        client.asCurrentUser.indices.create.mock.invocationCallOrder[0]
      );
    });

    it.each([
      ['no index mode of its own', undefined],
      ['another index mode', 'logsdb'],
    ])('replaces complete, recent events in an index with %s', async (_, mode) => {
      mockInstalled(EVENTS.length, NOW);
      mockIndexMode(mode);
      mockBulkAccepted();

      await expect(install()).resolves.toMatchObject({ status: 'replaced' });

      expect(client.asCurrentUser.indices.getSettings).toHaveBeenCalledWith({
        index: INDEX,
        name: 'index.mode',
      });
      expect(client.asCurrentUser.indices.delete).toHaveBeenCalledWith({ index: INDEX });
      expect(client.asCurrentUser.indices.create).toHaveBeenCalledWith(
        expect.objectContaining({
          settings: expect.objectContaining({ index: expect.objectContaining(COLUMNAR_SETTINGS) }),
        })
      );
    });

    it('does not read the index mode of events it replaces anyway', async () => {
      mockInstalled(0, null);
      mockBulkAccepted();

      await install();

      expect(client.asCurrentUser.indices.getSettings).not.toHaveBeenCalled();
    });

    it('throws what Elasticsearch answers when the caller may not read the index settings', async () => {
      mockInstalled(EVENTS.length, NOW);
      client.asCurrentUser.indices.getSettings.mockRejectedValue(
        esError(403, 'security_exception')
      );

      await expect(install()).rejects.toMatchObject({ statusCode: 403 });
      expect(client.asCurrentUser.indices.delete).not.toHaveBeenCalled();
    });

    it('throws what Elasticsearch answers when the caller may not read the index', async () => {
      client.asCurrentUser.search.mockRejectedValue(esError(403, 'security_exception'));

      await expect(install()).rejects.toMatchObject({ statusCode: 403 });
      expect(client.asCurrentUser.indices.create).not.toHaveBeenCalled();
    });

    it('throws what Elasticsearch answers when the caller may not create the index', async () => {
      mockNotInstalled();
      client.asCurrentUser.indices.create.mockRejectedValue(esError(403, 'security_exception'));

      await expect(install()).rejects.toMatchObject({ statusCode: 403 });
      expect(client.asCurrentUser.bulk).not.toHaveBeenCalled();
      expect(client.asCurrentUser.indices.delete).not.toHaveBeenCalled();
    });

    it('reports a conflict, and keeps the index, when another request is installing', async () => {
      mockNotInstalled();
      client.asCurrentUser.indices.create.mockRejectedValue(
        esError(400, 'resource_already_exists_exception')
      );

      await expect(install()).rejects.toMatchObject({
        name: 'SampleEventsInstallError',
        statusCode: 409,
      });
      expect(client.asCurrentUser.indices.delete).not.toHaveBeenCalled();
    });

    it('removes the index and fails when Elasticsearch rejects events', async () => {
      mockNotInstalled();
      client.asCurrentUser.bulk.mockResponse({
        took: 1,
        errors: true,
        items: [
          { index: { _index: INDEX, status: 201 } },
          {
            index: {
              _index: INDEX,
              status: 400,
              error: { type: 'strict_dynamic_mapping_exception', reason: 'field not allowed' },
            },
          },
        ],
      });

      const failure = install();

      await expect(failure).rejects.toBeInstanceOf(SampleEventsInstallError);
      await expect(failure).rejects.toMatchObject({
        statusCode: 500,
        message: expect.stringContaining(
          '1 of 2500 sample events were rejected: field not allowed'
        ),
      });
      expect(client.asCurrentUser.bulk).toHaveBeenCalledTimes(1);
      expect(client.asCurrentUser.indices.delete).toHaveBeenCalledWith({ index: INDEX });
    });

    it('reports events rejected for missing privileges as forbidden', async () => {
      mockNotInstalled();
      client.asCurrentUser.bulk.mockResponse({
        took: 1,
        errors: true,
        items: [
          {
            index: {
              _index: INDEX,
              status: 403,
              error: { type: 'security_exception', reason: 'unauthorized' },
            },
          },
        ],
      });

      await expect(install()).rejects.toMatchObject({ statusCode: 403 });
    });

    it('removes the index and rethrows when a bulk request fails', async () => {
      mockNotInstalled();
      client.asCurrentUser.bulk.mockRejectedValue(esError(503, 'unavailable'));

      await expect(install()).rejects.toMatchObject({ statusCode: 503 });
      expect(client.asCurrentUser.indices.delete).toHaveBeenCalledWith({ index: INDEX });
    });

    it('logs a failed clean-up and still throws the install failure', async () => {
      mockNotInstalled();
      client.asCurrentUser.bulk.mockRejectedValue(esError(503, 'unavailable'));
      client.asCurrentUser.indices.delete.mockRejectedValue(esError(403, 'security_exception'));

      await expect(install()).rejects.toMatchObject({ statusCode: 503 });
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('security_exception'));
    });
  });

  describe('removeSampleEvents', () => {
    it('deletes the index as the caller', async () => {
      await expect(removeSampleEvents({ client })).resolves.toEqual({
        index: INDEX,
        status: 'removed',
      });

      expect(client.asCurrentUser.indices.delete).toHaveBeenCalledWith({ index: INDEX });
      expect(client.asInternalUser.indices.delete).not.toHaveBeenCalled();
    });

    it('treats a missing index as already removed', async () => {
      client.asCurrentUser.indices.delete.mockRejectedValue(
        esError(404, 'index_not_found_exception')
      );

      await expect(removeSampleEvents({ client })).resolves.toEqual({
        index: INDEX,
        status: 'notInstalled',
      });
    });

    it('throws any other failure', async () => {
      client.asCurrentUser.indices.delete.mockRejectedValue(esError(403, 'security_exception'));

      await expect(removeSampleEvents({ client })).rejects.toMatchObject({ statusCode: 403 });
    });
  });
});
