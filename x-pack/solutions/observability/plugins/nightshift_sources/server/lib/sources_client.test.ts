/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { forbidden } from '@hapi/boom';
import type { SavedObject } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import {
  elasticsearchServiceMock,
  loggingSystemMock,
  savedObjectsClientMock,
  savedObjectsServiceMock,
} from '@kbn/core/server/mocks';
import { getNightshiftSourceViewName, type NightshiftSource } from '@kbn/nightshift-shared';
import {
  NIGHTSHIFT_SOURCE_SO_TYPE,
  type NightshiftSourceAttributes,
} from '../saved_objects/nightshift_source_saved_object';
import { createEsResponseError } from './es_errors.mock';
import { SourcesClient, type SourceViewsClient } from './sources_client';

const FULL_UPDATE = { mergeAttributes: false };

const unknownIndexError = () =>
  createEsResponseError(
    400,
    'verification_exception',
    'Found 1 problem\nline 1:6: Unknown index [logs-none]'
  );

const unknownColumnError = () =>
  createEsResponseError(
    400,
    'verification_exception',
    'Found 1 problem\nline 1:46: Unknown column [status]'
  );

const withColumns = { columns: [{ name: 'status', type: 'integer' }], values: [] };

const SPACE_ID = 'default';
const NGINX_VIEW_NAME = getNightshiftSourceViewName(SPACE_ID, 'nginx-errors');
const NGINX_VIEW_NAME_2 = getNightshiftSourceViewName(SPACE_ID, 'nginx-errors-2');
const TITLE_T_VIEW_NAME = getNightshiftSourceViewName(SPACE_ID, 't');

const makeAttributes = (
  overrides: Partial<NightshiftSourceAttributes> = {}
): NightshiftSourceAttributes => ({
  title: 'nginx errors',
  description: undefined,
  tags: ['nginx'],
  esql: 'FROM logs-nginx-* | WHERE status >= 500',
  type: 'logs',
  slug: 'nginx-errors',
  view_name: NGINX_VIEW_NAME,
  enabled: true,
  created_by: 'marco',
  created_at: '2026-09-01T00:00:00.000Z',
  updated_at: '2026-09-01T00:00:00.000Z',
  esql_updated_at: '2026-09-01T00:00:00.000Z',
  ...overrides,
});

const makeSavedObject = (
  attributes = makeAttributes(),
  id = 'source-1'
): SavedObject<NightshiftSourceAttributes> => ({
  id,
  type: NIGHTSHIFT_SOURCE_SO_TYPE,
  references: [],
  attributes,
});

const makeSource = (overrides: Partial<NightshiftSource> = {}): NightshiftSource => ({
  id: 'source-1',
  ...makeAttributes(),
  ...overrides,
});

const emptyFind = {
  saved_objects: [],
  total: 0,
  page: 1,
  per_page: 1,
};

const setup = () => {
  const soClient = savedObjectsClientMock.create();
  const serializer = savedObjectsServiceMock.createSerializer();
  const dataEsClient = elasticsearchServiceMock.createElasticsearchClient();
  const internalEsClient = elasticsearchServiceMock.createElasticsearchClient();
  const viewsClient: jest.Mocked<SourceViewsClient> = {
    putView: jest.fn().mockResolvedValue(undefined),
    getView: jest.fn().mockResolvedValue(undefined),
    deleteView: jest.fn().mockResolvedValue(undefined),
  };
  const logger = loggingSystemMock.createLogger();
  const onChange = jest.fn().mockResolvedValue(undefined);

  const client = new SourcesClient({
    soClient,
    serializer,
    viewsClient,
    dataEsClient,
    internalEsClient,
    logger,
    username: 'marco',
    spaceId: SPACE_ID,
    onChange,
  });

  soClient.find.mockResolvedValue(emptyFind);
  dataEsClient.esql.query.mockResponse(withColumns);

  return {
    client,
    soClient,
    viewsClient,
    dataEsClient,
    logger,
    onChange,
  };
};

describe('SourcesClient', () => {
  describe('assertReadable', () => {
    const hasPrivileges = (client: ReturnType<typeof setup>['dataEsClient'], granted: boolean) =>
      client.security.hasPrivileges.mockResolvedValue({
        has_all_requested: granted,
      } as never);

    it('rejects with 403 when the user lacks read on the data', async () => {
      const { client, soClient, dataEsClient } = setup();
      soClient.get.mockResolvedValue(makeSavedObject());
      hasPrivileges(dataEsClient, false);

      await expect(client.assertReadable('source-1')).rejects.toMatchObject({
        output: { statusCode: 403 },
      });
    });

    it('fails closed when the privilege check itself fails', async () => {
      const { client, soClient, dataEsClient } = setup();
      soClient.get.mockResolvedValue(makeSavedObject());
      dataEsClient.security.hasPrivileges.mockRejectedValue(new Error('security unavailable'));

      await expect(client.assertReadable('source-1')).rejects.toThrow('security unavailable');
    });

    it('trusts a source that only reads another cluster', async () => {
      const { client, soClient, dataEsClient } = setup();
      soClient.get.mockResolvedValue(
        makeSavedObject(makeAttributes({ esql: 'FROM remote:logs-nginx-*' }))
      );

      await expect(client.assertReadable('source-1')).resolves.toBeUndefined();

      expect(dataEsClient.security.hasPrivileges).not.toHaveBeenCalled();
    });

    it('checks only the local part of a source that also reads another cluster', async () => {
      const { client, soClient, dataEsClient } = setup();
      soClient.get.mockResolvedValue(
        makeSavedObject(makeAttributes({ esql: 'FROM remote:logs-*, logs-local' }))
      );
      hasPrivileges(dataEsClient, true);

      await expect(client.assertReadable('source-1')).resolves.toBeUndefined();

      expect(dataEsClient.security.hasPrivileges).toHaveBeenCalledWith({
        index: [{ names: ['logs-local'], privileges: ['read'] }],
      });
    });

    it('rejects with 403 when the stored query cannot be parsed', async () => {
      const { client, soClient, dataEsClient } = setup();
      soClient.get.mockResolvedValue(makeSavedObject(makeAttributes({ esql: 'FROM' })));

      await expect(client.assertReadable('source-1')).rejects.toMatchObject({
        output: { statusCode: 403 },
      });
      expect(dataEsClient.security.hasPrivileges).not.toHaveBeenCalled();
    });
  });

  describe('getHealth', () => {
    it('is unknown when the view cannot be read', async () => {
      const { client, viewsClient } = setup();
      viewsClient.getView.mockRejectedValue(forbidden('no read_view_metadata'));

      await expect(client.getHealth(makeSource())).resolves.toBe('unknown');
    });

    it('is unresolvable when Unknown index comes from a multi-source query', async () => {
      const { client, viewsClient, dataEsClient } = setup();
      const source = makeSource({
        esql: 'FROM logs-nginx-*, logs-none | WHERE status >= 500',
      });
      viewsClient.getView.mockResolvedValue({
        name: source.view_name,
        query: source.esql,
      });
      dataEsClient.esql.query.mockRejectedValue(unknownIndexError());

      await expect(client.getHealth(source)).resolves.toBe('unresolvable');
    });

    it('is unresolvable when the view no longer plans against existing indices', async () => {
      const { client, viewsClient, dataEsClient } = setup();
      viewsClient.getView.mockResolvedValue({
        name: NGINX_VIEW_NAME,
        query: makeAttributes().esql,
      });
      dataEsClient.esql.query
        .mockRejectedValueOnce(unknownColumnError())
        .mockResponseOnce(withColumns);

      await expect(client.getHealth(makeSource())).resolves.toBe('unresolvable');
      expect(dataEsClient.esql.query).toHaveBeenLastCalledWith({
        query: 'FROM logs-nginx-*\n| LIMIT 0',
        format: 'json',
      });
    });

    it('is unknown when the probe is forbidden', async () => {
      const { client, viewsClient, dataEsClient } = setup();
      viewsClient.getView.mockResolvedValue({
        name: NGINX_VIEW_NAME,
        query: makeAttributes().esql,
      });
      dataEsClient.esql.query.mockRejectedValue(
        createEsResponseError(403, 'security_exception', 'unauthorized')
      );

      await expect(client.getHealth(makeSource())).resolves.toBe('unknown');
    });
  });

  describe('create', () => {
    it('appends -2 when an orphaned view already uses that name', async () => {
      const { client, soClient, viewsClient } = setup();
      viewsClient.getView
        .mockResolvedValueOnce({ name: NGINX_VIEW_NAME, query: 'FROM logs-*' })
        .mockResolvedValueOnce(undefined);

      const source = await client.create({
        title: 'nginx errors',
        tags: [],
        esql: 'FROM logs-*',
      });

      expect(source.slug).toBe('nginx-errors-2');
      expect(source.view_name).toBe(NGINX_VIEW_NAME_2);
      expect(soClient.find).toHaveBeenCalledTimes(1);
      expect(viewsClient.getView).toHaveBeenCalledTimes(2);
    });

    it('does not treat Unknown index as empty when FROM names several sources', async () => {
      const { client, soClient, dataEsClient } = setup();
      dataEsClient.esql.query.mockRejectedValue(unknownIndexError());

      await expect(
        client.create({
          title: 't',
          tags: [],
          esql: 'FROM logs-nginx-*, logs-none | WHERE status >= 500',
        })
      ).rejects.toMatchObject({ output: { statusCode: 400 } });
      expect(soClient.create).not.toHaveBeenCalled();
    });

    it('rolls the saved object back when the view cannot be created', async () => {
      const { client, soClient, viewsClient } = setup();
      viewsClient.putView.mockRejectedValue(forbidden('no create_view'));

      await expect(
        client.create({ title: 't', tags: [], esql: 'FROM logs-*' })
      ).rejects.toMatchObject({ output: { statusCode: 403 } });
      expect(viewsClient.deleteView).toHaveBeenCalledWith(TITLE_T_VIEW_NAME);
      expect(soClient.delete).toHaveBeenCalledWith(NIGHTSHIFT_SOURCE_SO_TYPE, expect.any(String));
    });

    it('keeps the saved object when the failed create cannot delete its view', async () => {
      const { client, soClient, viewsClient } = setup();
      viewsClient.putView.mockRejectedValue(forbidden('no create_view'));
      viewsClient.deleteView.mockRejectedValue(forbidden('no delete_view'));

      await expect(
        client.create({ title: 't', tags: [], esql: 'FROM logs-*' })
      ).rejects.toMatchObject({ output: { statusCode: 403 } });
      expect(viewsClient.deleteView).toHaveBeenCalledWith(TITLE_T_VIEW_NAME);
      expect(soClient.delete).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('moves esql_updated_at forward when the clock does not', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-09-01T00:00:00.000Z'));
      try {
        const { client, soClient } = setup();
        soClient.get.mockResolvedValue(makeSavedObject());

        const sameMs = await client.update('source-1', {
          title: 'nginx errors',
          tags: ['nginx'],
          esql: 'FROM logs-nginx-* | WHERE status >= 400',
        });
        expect(sameMs.esql_updated_at).toBe('2026-09-01T00:00:00.001Z');

        jest.setSystemTime(new Date('2026-08-01T00:00:00.000Z'));
        const behind = await client.update('source-1', {
          title: 'nginx errors',
          tags: ['nginx'],
          esql: 'FROM logs-nginx-* | WHERE status >= 300',
        });
        expect(behind.esql_updated_at).toBe('2026-09-01T00:00:00.001Z');
      } finally {
        jest.useRealTimers();
      }
    });

    it('replaces the stored attributes instead of merging, so a dropped description is removed', async () => {
      const { client, soClient } = setup();
      const so = makeSavedObject(makeAttributes({ description: 'old' }));
      so.version = 'v1';
      soClient.get.mockResolvedValue(so);

      const updated = await client.update('source-1', {
        title: 'nginx errors',
        tags: ['nginx'],
        esql: makeAttributes().esql,
      });

      expect(updated.description).toBeUndefined();
      expect(soClient.update).toHaveBeenCalledWith(
        NIGHTSHIFT_SOURCE_SO_TYPE,
        'source-1',
        expect.objectContaining({ description: undefined }),
        { ...FULL_UPDATE, version: 'v1' }
      );
    });

    it('restores the previous attributes when the view cannot be updated', async () => {
      const { client, soClient, viewsClient } = setup();
      const previous = makeAttributes();
      soClient.get.mockResolvedValue(makeSavedObject(previous));
      soClient.update.mockResolvedValueOnce({ ...makeSavedObject(previous), version: 'v2' });
      viewsClient.putView.mockRejectedValue(forbidden('no create_view'));

      await expect(
        client.update('source-1', { title: 'new', tags: [], esql: 'FROM logs-other-*' })
      ).rejects.toMatchObject({ output: { statusCode: 403 } });

      expect(soClient.update).toHaveBeenCalledTimes(2);
      expect(soClient.update).toHaveBeenLastCalledWith(
        NIGHTSHIFT_SOURCE_SO_TYPE,
        'source-1',
        previous,
        { ...FULL_UPDATE, version: 'v2' }
      );
    });

    it('skips restore when the update response does not stamp a version', async () => {
      const { client, soClient, viewsClient, logger } = setup();
      const previous = makeAttributes();
      soClient.get.mockResolvedValue(makeSavedObject(previous));
      soClient.update.mockResolvedValueOnce(makeSavedObject(previous));
      viewsClient.putView.mockRejectedValue(forbidden('no create_view'));

      await expect(
        client.update('source-1', { title: 'new', tags: [], esql: 'FROM logs-other-*' })
      ).rejects.toMatchObject({ output: { statusCode: 403 } });

      expect(soClient.update).toHaveBeenCalledTimes(1);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Skipped restoring source source-1')
      );
    });
  });

  describe('delete', () => {
    it('does not delete the view when the caller cannot write the saved object', async () => {
      const { client, soClient, viewsClient } = setup();
      soClient.get.mockResolvedValue(makeSavedObject());
      soClient.update.mockRejectedValue(
        SavedObjectsErrorHelpers.decorateForbiddenError(new Error('read only'))
      );

      await expect(client.delete('source-1')).rejects.toMatchObject({
        output: { statusCode: 403 },
      });
      expect(viewsClient.deleteView).not.toHaveBeenCalled();
      expect(soClient.delete).not.toHaveBeenCalled();
    });

    it('leaves the saved object in place when the view cannot be deleted', async () => {
      const { client, soClient, viewsClient } = setup();
      soClient.get.mockResolvedValue(makeSavedObject());
      viewsClient.deleteView.mockRejectedValue(forbidden('no delete_view'));

      await expect(client.delete('source-1')).rejects.toMatchObject({
        output: { statusCode: 403 },
      });
      expect(soClient.delete).not.toHaveBeenCalled();
    });
  });

  describe('change notifications', () => {
    it('reports a created source once its view exists', async () => {
      const { client, onChange } = setup();

      const source = await client.create({ title: 'nginx errors', tags: [], esql: 'FROM logs-*' });

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith({ type: 'created', source });
    });

    it('does not report a create that was rolled back', async () => {
      const { client, viewsClient, onChange } = setup();
      viewsClient.putView.mockRejectedValue(forbidden('no create_view'));

      await expect(
        client.create({ title: 'nginx errors', tags: [], esql: 'FROM logs-*' })
      ).rejects.toMatchObject({ output: { statusCode: 403 } });

      expect(onChange).not.toHaveBeenCalled();
    });

    it('reports an update with the source as it was before', async () => {
      const { client, soClient, onChange } = setup();
      soClient.get.mockResolvedValue(makeSavedObject());

      const source = await client.update('source-1', {
        title: 'nginx 5xx',
        tags: ['nginx'],
        esql: makeAttributes().esql,
      });

      expect(onChange).toHaveBeenCalledWith({
        type: 'updated',
        source,
        previous: makeSource(),
      });
    });

    it('does not report an enable that changed nothing', async () => {
      const { client, soClient, onChange } = setup();
      soClient.get.mockResolvedValue(makeSavedObject());

      await client.setEnabled('source-1', true);

      expect(onChange).not.toHaveBeenCalled();
    });

    it('reports a deleted source after its view and saved object are gone', async () => {
      const { client, soClient, onChange } = setup();
      soClient.get.mockResolvedValue(makeSavedObject());

      await client.delete('source-1');

      expect(onChange).toHaveBeenCalledWith({ type: 'deleted', source: makeSource() });
    });
  });
});
