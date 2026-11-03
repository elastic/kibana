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
// What ES returns for a wildcard that matches no index: one placeholder column.
const withoutColumns = { columns: [{ name: '<no-fields>', type: 'null' }], values: [] };

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

const setup = ({ spaceId = SPACE_ID }: { spaceId?: string } = {}) => {
  const soClient = savedObjectsClientMock.create();
  const serializer = savedObjectsServiceMock.createSerializer();
  serializer.generateRawId.mockImplementation(
    (namespace, type, id) => `${namespace ? `${namespace}:` : ''}${type}:${id}`
  );
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
    spaceId,
    onChange,
  });

  soClient.find.mockResolvedValue(emptyFind);
  dataEsClient.esql.query.mockResponse(withColumns);

  return {
    client,
    soClient,
    serializer,
    viewsClient,
    dataEsClient,
    internalEsClient,
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

    it('asks for read on the index patterns of the stored query as the current user', async () => {
      const { client, soClient, dataEsClient } = setup();
      soClient.get.mockResolvedValue(makeSavedObject());
      hasPrivileges(dataEsClient, true);

      await expect(client.assertReadable('source-1')).resolves.toBeUndefined();

      expect(dataEsClient.security.hasPrivileges).toHaveBeenCalledWith({
        index: [{ names: ['logs-nginx-*'], privileges: ['read'] }],
      });
      expect(dataEsClient.esql.query).not.toHaveBeenCalled();
    });

    it('checks every index of a multi-index source and drops selectors and exclusions', async () => {
      const { client, soClient, dataEsClient } = setup();
      soClient.get.mockResolvedValue(
        makeSavedObject(makeAttributes({ esql: 'FROM logs-a-*::data, logs-b, -logs-a-old' }))
      );
      hasPrivileges(dataEsClient, true);

      await client.assertReadable('source-1');

      expect(dataEsClient.security.hasPrivileges).toHaveBeenCalledWith({
        index: [{ names: ['logs-a-*', 'logs-b'], privileges: ['read'] }],
      });
    });

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

    it('rejects with 403 when the local part of a mixed source is not readable', async () => {
      const { client, soClient, dataEsClient } = setup();
      soClient.get.mockResolvedValue(
        makeSavedObject(makeAttributes({ esql: 'FROM remote:logs-*, logs-local' }))
      );
      hasPrivileges(dataEsClient, false);

      await expect(client.assertReadable('source-1')).rejects.toMatchObject({
        output: { statusCode: 403 },
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

    it('is view_drift when the view query differs beyond formatting', async () => {
      const { client, viewsClient } = setup();
      viewsClient.getView.mockResolvedValue({
        name: NGINX_VIEW_NAME,
        query: 'FROM logs-nginx-* | WHERE status >= 400',
      });

      await expect(client.getHealth(makeSource())).resolves.toBe('view_drift');
    });

    it('treats formatting-only differences as matching', async () => {
      const { client, viewsClient, dataEsClient } = setup();
      viewsClient.getView.mockResolvedValue({
        name: NGINX_VIEW_NAME,
        query: 'from   logs-nginx-*\n| where status>=500',
      });

      await expect(client.getHealth(makeSource())).resolves.toBe('ok');
      expect(dataEsClient.esql.query).toHaveBeenCalledWith({
        query: `FROM ${NGINX_VIEW_NAME} | LIMIT 0`,
        format: 'json',
      });
    });

    it('is ok when the probe hits a pattern with no indices yet', async () => {
      const { client, viewsClient, dataEsClient } = setup();
      viewsClient.getView.mockResolvedValue({
        name: NGINX_VIEW_NAME,
        query: makeAttributes().esql,
      });
      dataEsClient.esql.query.mockRejectedValue(unknownIndexError());

      await expect(client.getHealth(makeSource())).resolves.toBe('ok');
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

    it('is ok when the view cannot resolve columns because nothing exists behind it yet', async () => {
      const { client, viewsClient, dataEsClient } = setup();
      viewsClient.getView.mockResolvedValue({
        name: NGINX_VIEW_NAME,
        query: makeAttributes().esql,
      });
      dataEsClient.esql.query
        .mockRejectedValueOnce(unknownColumnError())
        .mockResponseOnce(withoutColumns);

      await expect(client.getHealth(makeSource())).resolves.toBe('ok');
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

    it('is unknown when the follow-up source probe fails for a non-verification reason', async () => {
      const { client, viewsClient, dataEsClient } = setup();
      viewsClient.getView.mockResolvedValue({
        name: NGINX_VIEW_NAME,
        query: makeAttributes().esql,
      });
      dataEsClient.esql.query
        .mockRejectedValueOnce(unknownColumnError())
        .mockRejectedValueOnce(createEsResponseError(503, 'unavailable', 'shards down'));

      await expect(client.getHealth(makeSource())).resolves.toBe('unknown');
    });
  });

  describe('validateQuery', () => {
    it('reports whether any index exists yet behind an accepted query', async () => {
      const { client, dataEsClient } = setup();

      await expect(client.validateQuery({ esql: 'FROM logs-nginx-*' })).resolves.toEqual({
        type: 'logs',
        indexExists: true,
      });

      dataEsClient.esql.query.mockResponseOnce(withoutColumns);
      await expect(client.validateQuery({ esql: 'FROM logs-none-*' })).resolves.toEqual({
        type: 'logs',
        indexExists: false,
      });

      dataEsClient.esql.query.mockRejectedValueOnce(unknownIndexError());
      await expect(client.validateQuery({ esql: 'FROM logs-none' })).resolves.toEqual({
        type: 'logs',
        indexExists: false,
      });

      dataEsClient.esql.query
        .mockRejectedValueOnce(unknownColumnError())
        .mockResponseOnce(withoutColumns);
      await expect(
        client.validateQuery({ esql: 'FROM logs-none-* | WHERE status >= 500' })
      ).resolves.toEqual({ type: 'logs', indexExists: false });
    });
  });

  describe('create', () => {
    it('puts the request space into the view name', async () => {
      const { client } = setup({ spaceId: 'marketing' });

      const source = await client.create({
        title: 'nginx errors',
        tags: [],
        esql: 'FROM logs-*',
      });

      expect(source.view_name).toBe(getNightshiftSourceViewName('marketing', 'nginx-errors'));
    });

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

    it('rejects a blank title before touching saved objects or ES', async () => {
      const { client, soClient, viewsClient, dataEsClient } = setup();

      await expect(
        client.create({ title: '   ', tags: [], esql: 'FROM logs-*' })
      ).rejects.toMatchObject({ output: { statusCode: 400 } });
      expect(dataEsClient.esql.query).not.toHaveBeenCalled();
      expect(soClient.create).not.toHaveBeenCalled();
      expect(viewsClient.putView).not.toHaveBeenCalled();
    });

    it('rejects a query that mixes types before touching saved objects or ES', async () => {
      const { client, soClient, viewsClient, dataEsClient } = setup();

      await expect(
        client.create({ title: 't', tags: [], esql: 'FROM logs-*, traces-*' })
      ).rejects.toMatchObject({
        output: { statusCode: 400 },
        message: expect.stringContaining('mixes'),
      });
      expect(dataEsClient.esql.query).not.toHaveBeenCalled();
      expect(soClient.create).not.toHaveBeenCalled();
      expect(viewsClient.putView).not.toHaveBeenCalled();
    });

    it('rejects an invalid query before touching saved objects or ES', async () => {
      const { client, soClient, viewsClient, dataEsClient } = setup();

      await expect(
        client.create({ title: 't', tags: [], esql: 'FROM logs-* | STATS c = COUNT(*)' })
      ).rejects.toMatchObject({ output: { statusCode: 400 } });
      expect(dataEsClient.esql.query).not.toHaveBeenCalled();
      expect(soClient.create).not.toHaveBeenCalled();
      expect(viewsClient.putView).not.toHaveBeenCalled();
    });

    it('rejects a Nightshift source view before touching saved objects or ES', async () => {
      const { client, soClient, viewsClient, dataEsClient } = setup();

      await expect(
        client.create({ title: 't', tags: [], esql: 'FROM $.nightshift.sources.*' })
      ).rejects.toMatchObject({ output: { statusCode: 400 } });
      expect(dataEsClient.esql.query).not.toHaveBeenCalled();
      expect(soClient.create).not.toHaveBeenCalled();
      expect(viewsClient.putView).not.toHaveBeenCalled();
    });

    it('rejects a $ wildcard that would match Nightshift source views', async () => {
      const { client, soClient, viewsClient, dataEsClient } = setup();

      await expect(client.create({ title: 't', tags: [], esql: 'FROM $.*' })).rejects.toMatchObject(
        { output: { statusCode: 400 } }
      );
      expect(dataEsClient.esql.query).not.toHaveBeenCalled();
      expect(soClient.create).not.toHaveBeenCalled();
      expect(viewsClient.putView).not.toHaveBeenCalled();
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

    // A wildcard matching nothing resolves to an empty relation, so ES reports the WHERE field
    // as an unknown column instead of an unknown index.
    it('surfaces an unknown field on an existing index as a 400', async () => {
      const { client, soClient, dataEsClient } = setup();
      dataEsClient.esql.query
        .mockRejectedValueOnce(
          createEsResponseError(400, 'verification_exception', 'Unknown column [nope]')
        )
        .mockResponseOnce(withColumns);

      await expect(
        client.create({ title: 't', tags: [], esql: 'FROM logs-* | WHERE nope > 1' })
      ).rejects.toMatchObject({
        output: { statusCode: 400 },
        message: expect.stringContaining('Unknown column [nope]'),
      });
      expect(soClient.create).not.toHaveBeenCalled();
    });

    it('surfaces a non-verification ES failure with its own status', async () => {
      const { client, soClient, dataEsClient } = setup();
      dataEsClient.esql.query.mockRejectedValue(
        createEsResponseError(403, 'security_exception', 'unauthorized for user [x]')
      );

      await expect(
        client.create({ title: 't', tags: [], esql: 'FROM logs-* | WHERE x > 1' })
      ).rejects.toMatchObject({ output: { statusCode: 403 } });
      expect(dataEsClient.esql.query).toHaveBeenCalledTimes(1);
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
    it('rejects a disallowed command without writing', async () => {
      const { client, soClient, viewsClient, dataEsClient } = setup();
      soClient.get.mockResolvedValue(makeSavedObject());

      await expect(
        client.update('source-1', {
          title: 'nginx errors',
          tags: ['nginx'],
          esql: 'FROM logs-* | STATS c = COUNT(*)',
        })
      ).rejects.toMatchObject({ output: { statusCode: 400 } });
      expect(dataEsClient.esql.query).not.toHaveBeenCalled();
      expect(soClient.update).not.toHaveBeenCalled();
      expect(viewsClient.putView).not.toHaveBeenCalled();
    });

    it('rejects a Nightshift source view without writing', async () => {
      const { client, soClient, viewsClient, dataEsClient } = setup();
      soClient.get.mockResolvedValue(makeSavedObject());

      await expect(
        client.update('source-1', {
          title: 'nginx errors',
          tags: ['nginx'],
          esql: 'FROM $.nightshift.sources.abc',
        })
      ).rejects.toMatchObject({ output: { statusCode: 400 } });
      expect(dataEsClient.esql.query).not.toHaveBeenCalled();
      expect(soClient.update).not.toHaveBeenCalled();
      expect(viewsClient.putView).not.toHaveBeenCalled();
    });

    it('keeps the stored type on a title-only save', async () => {
      const { client, soClient } = setup();
      soClient.get.mockResolvedValue(makeSavedObject());

      const updated = await client.update('source-1', {
        title: 'renamed',
        tags: ['nginx'],
        esql: 'FROM logs-nginx-* | WHERE status >= 500',
      });

      expect(updated.type).toBe('logs');
      expect(updated.title).toBe('renamed');
    });

    it('recomputes the type when the query changes', async () => {
      const { client, soClient } = setup();
      soClient.get.mockResolvedValue(makeSavedObject());

      const updated = await client.update('source-1', {
        title: 'nginx errors',
        tags: ['nginx'],
        esql: 'TS metrics-*',
      });

      expect(updated.type).toBe('metrics');
      expect(soClient.update).toHaveBeenCalledWith(
        NIGHTSHIFT_SOURCE_SO_TYPE,
        'source-1',
        expect.objectContaining({ type: 'metrics' }),
        expect.anything()
      );
    });

    it('rejects an unresolvable field without writing', async () => {
      const { client, soClient, viewsClient, dataEsClient } = setup();
      soClient.get.mockResolvedValue(makeSavedObject());
      dataEsClient.esql.query
        .mockRejectedValueOnce(unknownColumnError())
        .mockResponseOnce(withColumns);

      await expect(
        client.update('source-1', {
          title: 'nginx errors',
          tags: ['nginx'],
          esql: 'FROM logs-* | WHERE nope > 1',
        })
      ).rejects.toMatchObject({ output: { statusCode: 400 } });
      expect(soClient.update).not.toHaveBeenCalled();
      expect(viewsClient.putView).not.toHaveBeenCalled();
    });

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

    it.each([false, true])('keeps the stored enabled state when the body says %s', async (sent) => {
      const { client, soClient } = setup();
      const stored = !sent;
      soClient.get.mockResolvedValue(makeSavedObject(makeAttributes({ enabled: stored })));
      const body = {
        title: 'nginx errors',
        tags: ['nginx'],
        esql: makeAttributes().esql,
        enabled: sent,
      };

      const updated = await client.update('source-1', body);

      expect(updated.enabled).toBe(stored);
      expect(soClient.update).toHaveBeenCalledWith(
        NIGHTSHIFT_SOURCE_SO_TYPE,
        'source-1',
        expect.objectContaining({ enabled: stored }),
        expect.anything()
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

    it('maps a missing saved object to a 404 that does not leak the type name', async () => {
      const { client, soClient } = setup();
      soClient.get.mockRejectedValue(
        SavedObjectsErrorHelpers.createGenericNotFoundError(NIGHTSHIFT_SOURCE_SO_TYPE, 'nope')
      );

      await expect(
        client.update('nope', { title: 't', tags: [], esql: 'FROM logs-*' })
      ).rejects.toMatchObject({
        output: { statusCode: 404 },
        message: 'Source nope not found',
      });
    });
  });

  describe('delete', () => {
    it('deletes the view first, then the saved object', async () => {
      const { client, soClient, viewsClient } = setup();
      soClient.get.mockResolvedValue(makeSavedObject());

      const callOrder: string[] = [];
      soClient.delete.mockImplementation(async () => {
        callOrder.push('so');
        return {};
      });
      viewsClient.deleteView.mockImplementation(async () => {
        callOrder.push('view');
      });

      await client.delete('source-1');

      expect(soClient.delete).toHaveBeenCalledWith(NIGHTSHIFT_SOURCE_SO_TYPE, 'source-1');
      expect(viewsClient.deleteView).toHaveBeenCalledWith(NGINX_VIEW_NAME);
      expect(callOrder).toEqual(['view', 'so']);
    });

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

  describe('setEnabled', () => {
    it('flips the flag and touches updated_at only', async () => {
      const { client, soClient, viewsClient } = setup();
      soClient.get.mockResolvedValue(makeSavedObject());

      const source = await client.setEnabled('source-1', false);

      expect(source.enabled).toBe(false);
      expect(source.esql_updated_at).toBe('2026-09-01T00:00:00.000Z');
      expect(viewsClient.putView).not.toHaveBeenCalled();
    });

    it('short-circuits when the flag already matches', async () => {
      const { client, soClient } = setup();
      soClient.get.mockResolvedValue(makeSavedObject());

      const source = await client.setEnabled('source-1', true);

      expect(source.enabled).toBe(true);
      expect(source.updated_at).toBe('2026-09-01T00:00:00.000Z');
      expect(soClient.update).not.toHaveBeenCalled();
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

    it('does not report an update that was restored', async () => {
      const { client, soClient, viewsClient, onChange } = setup();
      soClient.get.mockResolvedValue(makeSavedObject());
      soClient.update.mockResolvedValueOnce({ ...makeSavedObject(), version: 'v2' });
      viewsClient.putView.mockRejectedValue(forbidden('no create_view'));

      await expect(
        client.update('source-1', { title: 'new', tags: [], esql: 'FROM logs-other-*' })
      ).rejects.toMatchObject({ output: { statusCode: 403 } });

      expect(onChange).not.toHaveBeenCalled();
    });

    it('reports a disabled source as an update', async () => {
      const { client, soClient, onChange } = setup();
      soClient.get.mockResolvedValue(makeSavedObject());

      const source = await client.setEnabled('source-1', false);

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

    it('does not report a delete whose view could not be removed', async () => {
      const { client, soClient, viewsClient, onChange } = setup();
      soClient.get.mockResolvedValue(makeSavedObject());
      viewsClient.deleteView.mockRejectedValue(forbidden('no delete_view'));

      await expect(client.delete('source-1')).rejects.toMatchObject({
        output: { statusCode: 403 },
      });

      expect(onChange).not.toHaveBeenCalled();
    });
  });
});
