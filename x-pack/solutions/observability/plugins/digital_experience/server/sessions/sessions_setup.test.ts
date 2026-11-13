/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { SESSIONS_INDEX } from '../../common/sessions';
import {
  checkSessionsPrivileges,
  enableSessions,
  getMissingSessionsPrivileges,
  getRestrictedSourceIndices,
  getSessionsStatus,
  indexPatternCovers,
  indexPatternsOverlap,
} from './sessions_setup';
import { SessionsPrivilegesError } from './sessions_privileges_error';
import { SessionsRestrictedReadError } from './sessions_restricted_read_error';
import { sessionsIndexTemplate } from './sessions_spec';

type ScopedClient = ReturnType<typeof elasticsearchServiceMock.createScopedClusterClient>;
type Client = ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;

const SOURCE_INDICES = ['traces-*.otel-*', 'logs-*.otel-*'];
/** How the predefined Serverless `editor` and `viewer` roles grant read. */
const EDITOR_READ_PATTERN = '/~(([.]|ilm-history-).*)/';

type IndexPrivilegesEntry = Awaited<
  ReturnType<Client['security']['getUserPrivileges']>
>['indices'][number];

type RoleIndices = NonNullable<
  Awaited<ReturnType<Client['security']['queryRole']>>['roles'][number]['indices']
>[number];

const mockReadPrivileges = (client: Client, indices: Array<Partial<IndexPrivilegesEntry>>) =>
  client.security.getUserPrivileges.mockResolvedValue({
    applications: [],
    cluster: [],
    global: [],
    run_as: [],
    indices: indices.map((entry) => ({
      names: SOURCE_INDICES,
      privileges: ['read', 'view_index_metadata'],
      allow_restricted_indices: false,
      ...entry,
    })),
  });

const esError = (statusCode: number) =>
  new errors.ResponseError({
    statusCode,
    body: {},
    headers: {},
    warnings: null,
    meta: {} as never,
  });

const grantAll = (client: Client) => {
  client.security.hasPrivileges.mockResolvedValue({
    has_all_requested: true,
    cluster: {},
    index: {},
    application: {},
    username: 'setup-user',
  });
  mockReadPrivileges(client, [{}]);
};

describe('sessions setup', () => {
  let esClient: ScopedClient;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createScopedClusterClient();
  });

  describe('getMissingSessionsPrivileges', () => {
    it('lists every missing cluster and index privilege', async () => {
      esClient.asCurrentUser.security.hasPrivileges.mockResolvedValue({
        has_all_requested: false,
        cluster: { manage_index_templates: false },
        index: { 'traces-*.otel-*': { read: false, view_index_metadata: true } },
        application: {},
        username: 'reader',
      });

      expect(
        await getMissingSessionsPrivileges(esClient.asCurrentUser, { isServerless: false })
      ).toEqual(['cluster:manage_index_templates', 'index:traces-*.otel-*:read']);
    });

    it('also requires read_security on Serverless, to read the user’s roles', async () => {
      esClient.asCurrentUser.security.hasPrivileges.mockResolvedValue({
        has_all_requested: false,
        cluster: { manage_index_templates: false, read_security: false },
        index: {},
        application: {},
        username: 'reader',
      });

      expect(
        await getMissingSessionsPrivileges(esClient.asCurrentUser, { isServerless: true })
      ).toEqual(['cluster:manage_index_templates', 'cluster:read_security']);
      expect(esClient.asCurrentUser.security.hasPrivileges).toHaveBeenCalledWith(
        expect.objectContaining({
          cluster: ['manage_index_templates', 'read_security'],
        })
      );
    });

    it('does not require read_security on stateful', async () => {
      grantAll(esClient.asCurrentUser);

      await getMissingSessionsPrivileges(esClient.asCurrentUser, { isServerless: false });

      expect(esClient.asCurrentUser.security.hasPrivileges).toHaveBeenCalledWith(
        expect.objectContaining({
          cluster: ['manage_index_templates'],
        })
      );
    });
  });

  describe('checkSessionsPrivileges', () => {
    it('refuses a user who lacks privileges', async () => {
      esClient.asCurrentUser.security.hasPrivileges.mockResolvedValue({
        has_all_requested: false,
        cluster: { manage_index_templates: false },
        index: {},
        application: {},
        username: 'reader',
      });

      await expect(
        checkSessionsPrivileges(esClient.asCurrentUser, { isServerless: false })
      ).rejects.toBeInstanceOf(SessionsPrivilegesError);
    });

    it.each([
      ['document-level security', { query: ['{"term":{"service.name":"checkout-web"}}'] }],
      ['field-level security', { field_security: [{ grant: ['@timestamp', 'resource.*'] }] }],
    ])('refuses a user whose source read is filtered by %s', async (_name, restriction) => {
      grantAll(esClient.asCurrentUser);
      mockReadPrivileges(esClient.asCurrentUser, [restriction]);

      const error = await checkSessionsPrivileges(esClient.asCurrentUser, {
        isServerless: false,
      }).catch((e) => e);

      expect(error).toBeInstanceOf(SessionsRestrictedReadError);
      expect(error.restrictedIndices).toEqual(SOURCE_INDICES);
      expect(error.message).toContain('without document- or field-level security');
    });

    it('passes a user with every privilege and unfiltered reads', async () => {
      grantAll(esClient.asCurrentUser);

      await expect(
        checkSessionsPrivileges(esClient.asCurrentUser, { isServerless: false })
      ).resolves.toBeUndefined();
    });
  });

  describe('enableSessions', () => {
    const enableArgs = () => ({ esClient, isServerless: false });
    const alreadyExists = () =>
      new errors.ResponseError({
        statusCode: 400,
        body: { error: { type: 'resource_already_exists_exception' } },
        headers: {},
        warnings: null,
        meta: {} as never,
      });

    beforeEach(() => {
      grantAll(esClient.asCurrentUser);
    });

    it('puts the index template and creates the index as the user', async () => {
      await enableSessions(enableArgs());

      const { asCurrentUser, asInternalUser, asSecondaryAuthUser } = esClient;
      expect(asCurrentUser.indices.putIndexTemplate).toHaveBeenCalledWith(sessionsIndexTemplate);
      expect(asCurrentUser.indices.create).toHaveBeenCalledWith({ index: SESSIONS_INDEX });
      expect(asInternalUser.indices.putIndexTemplate).not.toHaveBeenCalled();
      expect(asSecondaryAuthUser.indices.putIndexTemplate).not.toHaveBeenCalled();
    });

    it('creates the index after its template, so the template maps it', async () => {
      await enableSessions(enableArgs());

      const { putIndexTemplate, create } = esClient.asCurrentUser.indices;
      expect(putIndexTemplate.mock.invocationCallOrder[0]).toBeLessThan(
        create.mock.invocationCallOrder[0]
      );
    });

    it('writes nothing for a user who lacks privileges', async () => {
      esClient.asCurrentUser.security.hasPrivileges.mockResolvedValue({
        has_all_requested: false,
        cluster: { manage_index_templates: false },
        index: {},
        application: {},
        username: 'reader',
      });

      await expect(enableSessions(enableArgs())).rejects.toBeInstanceOf(SessionsPrivilegesError);
      expect(esClient.asCurrentUser.indices.putIndexTemplate).not.toHaveBeenCalled();
      expect(esClient.asCurrentUser.indices.create).not.toHaveBeenCalled();
    });

    it('writes nothing for a user whose source read is filtered', async () => {
      mockReadPrivileges(esClient.asCurrentUser, [
        { query: ['{"term":{"service.name":"checkout-web"}}'] },
      ]);

      await expect(enableSessions(enableArgs())).rejects.toBeInstanceOf(
        SessionsRestrictedReadError
      );
      expect(esClient.asCurrentUser.indices.putIndexTemplate).not.toHaveBeenCalled();
      expect(esClient.asCurrentUser.indices.create).not.toHaveBeenCalled();
    });

    it('also checks read_security on Serverless', async () => {
      await enableSessions({ esClient, isServerless: true });

      expect(esClient.asCurrentUser.security.hasPrivileges).toHaveBeenCalledWith(
        expect.objectContaining({ cluster: ['manage_index_templates', 'read_security'] })
      );
    });

    it('waits until the new index accepts searches', async () => {
      const { count } = esClient.asCurrentUser;
      count.mockRejectedValueOnce(esError(503));

      await enableSessions(enableArgs());

      expect(count).toHaveBeenCalledTimes(2);
      expect(count).toHaveBeenCalledWith({ index: SESSIONS_INDEX, ignore_unavailable: true });
    });

    it('does not wait on errors other than an unavailable index', async () => {
      esClient.asCurrentUser.count.mockRejectedValue(esError(403));

      await enableSessions(enableArgs());

      expect(esClient.asCurrentUser.count).toHaveBeenCalledTimes(1);
    });

    it('keeps an existing index, without needing view_index_metadata to check for it', async () => {
      esClient.asCurrentUser.indices.create.mockRejectedValue(alreadyExists());

      await expect(enableSessions(enableArgs())).resolves.toBeUndefined();
      expect(esClient.asCurrentUser.indices.exists).not.toHaveBeenCalled();
    });

    it('fails when the index cannot be created for another reason', async () => {
      esClient.asCurrentUser.indices.create.mockRejectedValue(esError(403));

      await expect(enableSessions(enableArgs())).rejects.toThrow();
      expect(esClient.asCurrentUser.count).not.toHaveBeenCalled();
    });
  });

  describe('indexPatternCovers', () => {
    it.each([
      ['logs-*.otel-*', 'logs-*.otel-*', true],
      ['logs-*', 'logs-*.otel-*', true],
      ['*', 'logs-*.otel-*', true],
      ['logs-*l-*', 'logs-*.otel-*', true],
      ['logs-checkout*', 'logs-*.otel-*', false],
      ['logs-*.otel-default', 'logs-*.otel-*', false],
      ['traces-*', 'logs-*.otel-*', false],
      ['logs-?.otel-*', 'logs-*.otel-*', false],
      ['/logs-.*/', 'logs-*.otel-*', false],
    ])('%s covers %s: %s', (rolePattern, pattern, covers) => {
      expect(indexPatternCovers(rolePattern, pattern)).toBe(covers);
    });
  });

  describe('indexPatternsOverlap', () => {
    it.each([
      ['logs-*.otel-*', 'logs-*.otel-*', true],
      ['logs-*', 'logs-*.otel-*', true],
      ['logs-checkout*', 'logs-*.otel-*', true],
      ['logs-*.otel-default', 'logs-*.otel-*', true],
      ['*-default', 'logs-*.otel-*', true],
      ['logs-?.otel-?', 'logs-*.otel-*', true],
      ['*', 'logs-*.otel-*', true],
      ['traces-*', 'logs-*.otel-*', false],
      ['logs-*.ecs-*', 'logs-*.otel-*', true],
      ['logs-apm.app', 'logs-*.otel-*', false],
      ['.siem-signals*', 'logs-*.otel-*', false],
      [EDITOR_READ_PATTERN, 'logs-*.otel-*', true],
    ])('%s overlaps %s: %s', (rolePattern, pattern, overlaps) => {
      expect(indexPatternsOverlap(rolePattern, pattern)).toBe(overlaps);
    });
  });

  describe('getRestrictedSourceIndices', () => {
    let client: Client;

    beforeEach(() => {
      client = elasticsearchServiceMock.createElasticsearchClient();
    });

    it('accepts unrestricted read on the source patterns', async () => {
      mockReadPrivileges(client, [{}]);
      expect(await getRestrictedSourceIndices(client)).toEqual({ indices: [], reason: 'filtered' });
    });

    it('lists only the patterns a role filters', async () => {
      mockReadPrivileges(client, [
        { names: ['traces-*.otel-*'] },
        { names: ['logs-*.otel-*'], query: ['{"match_all":{}}'] },
      ]);
      expect(await getRestrictedSourceIndices(client)).toEqual({
        indices: ['logs-*.otel-*'],
        reason: 'filtered',
      });
    });

    it('lets an unrestricted role on a broader pattern lift another role’s filter', async () => {
      // Elasticsearch merges roles per pattern only, so the broader grant comes as its own entry.
      mockReadPrivileges(client, [
        { query: ['{"term":{"service.name":"checkout-web"}}'] },
        { names: ['logs-*', 'traces-*'], privileges: ['all'] },
      ]);
      expect((await getRestrictedSourceIndices(client)).indices).toEqual([]);
    });

    it('ignores filters on privileges that do not read documents, and FLS that grants every field', async () => {
      mockReadPrivileges(client, [
        { privileges: ['view_index_metadata', 'monitor'], query: ['{"match_all":{}}'] },
        { names: ['logs-*.otel-*'], field_security: [{ grant: ['*'] }] },
      ]);
      expect((await getRestrictedSourceIndices(client)).indices).toEqual([]);
    });

    it('refuses a filtered read granted through an action pattern or another privilege', async () => {
      mockReadPrivileges(client, [
        {
          names: ['traces-*.otel-*'],
          privileges: ['indices:data/read/*', 'view_index_metadata'],
          query: ['{"match_all":{}}'],
        },
        {
          names: ['logs-*.otel-*'],
          privileges: ['read_failure_store'],
          field_security: [{ grant: ['@timestamp'] }],
        },
      ]);
      expect((await getRestrictedSourceIndices(client)).indices).toEqual(SOURCE_INDICES);
    });

    it('does not count an action pattern as proof of unrestricted read', async () => {
      mockReadPrivileges(client, [
        { query: ['{"match_all":{}}'] },
        { names: ['*'], privileges: ['indices:data/read/*'] },
      ]);
      expect((await getRestrictedSourceIndices(client)).indices).toEqual(SOURCE_INDICES);
    });

    it('ignores filters on indices the source patterns cannot match', async () => {
      mockReadPrivileges(client, [
        { names: ['.siem-signals*', 'metrics-*'], query: ['{"match_all":{}}'] },
        { names: ['logs-checkout*'], field_security: [{ grant: ['@timestamp'] }] },
      ]);
      expect((await getRestrictedSourceIndices(client)).indices).toEqual(['logs-*.otel-*']);
    });

    it('accepts a read granted through a regular expression, without filters', async () => {
      // `has_privileges` checks the read itself.
      mockReadPrivileges(client, [{ names: [EDITOR_READ_PATTERN] }]);
      expect((await getRestrictedSourceIndices(client)).indices).toEqual([]);
    });

    it('refuses a filtered read through a regular expression, which none can prove lifted', async () => {
      mockReadPrivileges(client, [
        { names: [EDITOR_READ_PATTERN], query: ['{"match_all":{}}'] },
        { names: [EDITOR_READ_PATTERN] },
      ]);
      expect((await getRestrictedSourceIndices(client)).indices).toEqual(SOURCE_INDICES);
    });

    it('cannot verify an API key with its own role descriptors', async () => {
      client.security.getUserPrivileges.mockRejectedValue(esError(400));
      expect(await getRestrictedSourceIndices(client)).toEqual({
        indices: SOURCE_INDICES,
        reason: 'unverifiable',
      });
    });

    it('rethrows other errors', async () => {
      client.security.getUserPrivileges.mockRejectedValue(esError(500));
      await expect(getRestrictedSourceIndices(client)).rejects.toThrow();
    });

    describe('on Serverless, where only operator users may read their privileges', () => {
      const mockAuthenticated = (
        roles: string[],
        authenticationType: 'token' | 'realm' | 'api_key' = 'token'
      ) =>
        client.security.authenticate.mockResolvedValue({
          username: 'uiam-user',
          roles,
          authentication_type: authenticationType,
        } as unknown as Awaited<ReturnType<Client['security']['authenticate']>>);

      const mockRoles = (roles: Array<{ name: string; indices: Array<Partial<RoleIndices>> }>) =>
        client.security.queryRole.mockResolvedValue({
          total: roles.length,
          count: roles.length,
          roles: roles.map(({ name, indices }) => ({
            name,
            cluster: [],
            run_as: [],
            indices: indices.map((entry) => ({
              names: SOURCE_INDICES,
              privileges: ['read', 'view_index_metadata'],
              ...entry,
            })),
          })),
        } as Awaited<ReturnType<Client['security']['queryRole']>>);

      beforeEach(() => {
        client.security.getUserPrivileges.mockRejectedValue(esError(410));
      });

      it('reads the user’s roles, including predefined ones, and accepts unrestricted read', async () => {
        mockAuthenticated(['admin']);
        mockRoles([{ name: 'admin', indices: [{ names: ['*'], privileges: ['all'] }] }]);

        expect(await getRestrictedSourceIndices(client)).toEqual({
          indices: [],
          reason: 'filtered',
        });
        expect(client.security.queryRole).toHaveBeenCalledWith({
          query: { terms: { name: ['admin'] } },
          size: 1,
        });
      });

      it('lists the patterns a role filters by document- or field-level security', async () => {
        mockAuthenticated(['traces-dls', 'logs-fls']);
        mockRoles([
          {
            name: 'traces-dls',
            indices: [{ names: ['traces-*'], query: '{"term":{"service.name":"checkout-web"}}' }],
          },
          {
            name: 'logs-fls',
            indices: [{ names: ['logs-*'], field_security: { grant: ['@timestamp'] } }],
          },
        ]);

        expect(await getRestrictedSourceIndices(client)).toEqual({
          indices: SOURCE_INDICES,
          reason: 'filtered',
        });
      });

      it('lets an unrestricted role lift another role’s filter', async () => {
        mockAuthenticated(['dls', 'reader']);
        mockRoles([
          { name: 'dls', indices: [{ query: '{"match_all":{}}' }] },
          { name: 'reader', indices: [{}] },
        ]);

        expect((await getRestrictedSourceIndices(client)).indices).toEqual([]);
      });

      it('accepts the predefined editor role’s regular expression read next to a custom role', async () => {
        mockAuthenticated(['editor', 'sessions-setup']);
        mockRoles([
          {
            name: 'editor',
            indices: [
              { names: [EDITOR_READ_PATTERN], privileges: ['read', 'view_index_metadata'] },
              { names: ['.siem-signals*'], privileges: ['read'], query: '{"match_all":{}}' },
            ],
          },
          {
            name: 'sessions-setup',
            indices: [{ names: ['digital-experience-sessions-*'], privileges: ['all'] }],
          },
        ]);

        expect((await getRestrictedSourceIndices(client)).indices).toEqual([]);
      });

      it('finds no filter for a user without roles, and reads none', async () => {
        mockAuthenticated([], 'realm');

        expect((await getRestrictedSourceIndices(client)).indices).toEqual([]);
        expect(client.security.queryRole).not.toHaveBeenCalled();
      });

      it('cannot verify an API key, which holds no roles', async () => {
        mockAuthenticated([], 'api_key');

        expect(await getRestrictedSourceIndices(client)).toEqual({
          indices: SOURCE_INDICES,
          reason: 'unverifiable',
        });
        expect(client.security.queryRole).not.toHaveBeenCalled();
      });

      it('rethrows errors reading the roles', async () => {
        mockAuthenticated(['custom']);
        client.security.queryRole.mockRejectedValue(esError(403));

        await expect(getRestrictedSourceIndices(client)).rejects.toThrow();
      });
    });
  });

  describe('getSessionsStatus', () => {
    let client: Client;

    beforeEach(() => {
      client = elasticsearchServiceMock.createElasticsearchClient();
    });

    it('reports sessions as set up when the sessions index exists', async () => {
      client.indices.exists.mockResolvedValue(true);

      expect(await getSessionsStatus(client)).toEqual({ installed: true });
      expect(client.indices.exists).toHaveBeenCalledWith(
        { index: SESSIONS_INDEX },
        { signal: undefined }
      );
    });

    it('reports sessions as not set up without the sessions index', async () => {
      client.indices.exists.mockResolvedValue(false);

      expect(await getSessionsStatus(client)).toEqual({ installed: false });
    });

    it('passes the abort signal on', async () => {
      client.indices.exists.mockResolvedValue(true);
      const { signal } = new AbortController();

      await getSessionsStatus(client, { signal });

      expect(client.indices.exists).toHaveBeenCalledWith({ index: SESSIONS_INDEX }, { signal });
    });

    it('never writes', async () => {
      client.indices.exists.mockResolvedValue(true);

      await getSessionsStatus(client);

      expect(client.indices.create).not.toHaveBeenCalled();
      expect(client.indices.putIndexTemplate).not.toHaveBeenCalled();
      expect(client.indices.delete).not.toHaveBeenCalled();
    });
  });
});
