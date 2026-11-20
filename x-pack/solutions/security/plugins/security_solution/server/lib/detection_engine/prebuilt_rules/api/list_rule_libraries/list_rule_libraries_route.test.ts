/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { ensureLibraries } from '@kbn/security-rule-libraries';
import type { RuleLibraryAttributes } from '@kbn/security-rule-libraries';
import { LIST_RULE_LIBRARIES_URL } from '../../../../../../common/api/detection_engine/prebuilt_rules';
import { requestContextMock, requestMock, serverMock } from '../../../routes/__mocks__';
import { createPrebuiltRuleAssetsClient } from '../../logic/rule_assets/prebuilt_rule_assets_client';
import { listRuleLibrariesRoute } from './list_rule_libraries_route';

jest.mock('@kbn/security-rule-libraries', () => ({
  ...jest.requireActual('@kbn/security-rule-libraries'),
  ensureLibraries: jest.fn(),
}));
jest.mock('../../logic/rule_assets/prebuilt_rule_assets_client');

const listRequest = () => requestMock.create({ method: 'get', path: LIST_RULE_LIBRARIES_URL });

const libraryObject = (id: string, attributes: Partial<RuleLibraryAttributes>) => ({
  id,
  type: 'security-rule-library',
  references: [],
  score: 1,
  attributes: {
    name: id,
    title: id,
    provider: { type: 'git' as const },
    ...attributes,
  },
});

describe('listRuleLibrariesRoute', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();
  const savedObjectsClient = savedObjectsClientMock.create();

  const respondWith = (objects: Array<ReturnType<typeof libraryObject>>) =>
    savedObjectsClient.find.mockResolvedValue({
      saved_objects: objects,
      total: objects.length,
      per_page: 1000,
      page: 1,
    });

  beforeEach(() => {
    jest.clearAllMocks();
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());
    clients.core.savedObjects.getClient = jest.fn(() => savedObjectsClient);
    jest.mocked(createPrebuiltRuleAssetsClient).mockReturnValue({
      fetchRuleCountsByLibrary: jest.fn().mockResolvedValue({ elastic: 2479 }),
    } as unknown as ReturnType<typeof createPrebuiltRuleAssetsClient>);
    listRuleLibrariesRoute(server.router, clients.logger);
  });

  it('ensures the built-in libraries exist before listing', async () => {
    respondWith([]);

    await server.inject(listRequest(), requestContextMock.convertContext(context));

    expect(ensureLibraries).toHaveBeenCalledTimes(1);
  });

  it('returns each library with its distinct rule count', async () => {
    respondWith([
      libraryObject('elastic', {
        title: 'Prebuilt Security Detection Rules',
        provider: { type: 'fleet' },
        version: '9.6.1',
        refresh_status: 'refreshed',
        refreshed_at: '2026-11-19T10:00:00.000Z',
        item_count: 7000,
      }),
    ]);

    const response = await server.inject(listRequest(), requestContextMock.convertContext(context));

    expect(response.status).toEqual(200);
    expect(response.body.libraries).toEqual([
      expect.objectContaining({
        id: 'elastic',
        provider: 'fleet',
        version: '9.6.1',
        refresh_status: 'refreshed',
        rule_count: 2479,
        scope: 'shared',
      }),
    ]);
  });

  it('says which libraries are built in', async () => {
    respondWith([
      libraryObject('elastic', { title: 'Prebuilt Security Detection Rules' }),
      libraryObject('af4bc789-1faa-4e9d-9827-afb71e2a4d68', {
        title: 'Added by a user',
        owner: { type: 'community' },
      }),
    ]);

    const response = await server.inject(listRequest(), requestContextMock.convertContext(context));

    expect(
      response.body.libraries.map(
        ({ id, built_in: builtIn }: { id: string; built_in: boolean }) => [id, builtIn]
      )
    ).toEqual([
      ['elastic', true],
      ['af4bc789-1faa-4e9d-9827-afb71e2a4d68', false],
    ]);
  });

  it('leaves version and status unset for a library that was never refreshed', async () => {
    respondWith([libraryObject('elastic-community', { title: 'Elastic Community Rules' })]);

    const response = await server.inject(listRequest(), requestContextMock.convertContext(context));

    const [library] = response.body.libraries;
    expect(library.version).toBeUndefined();
    expect(library.refresh_status).toBeUndefined();
    expect(library.rule_count).toBe(0);
  });

  it('only lists shared libraries and libraries of the current space', async () => {
    respondWith([
      libraryObject('shared', { title: 'Shared' }),
      libraryObject('mine', { title: 'Mine', space_id: 'default' }),
      libraryObject('theirs', { title: 'Theirs', space_id: 'other' }),
    ]);

    const response = await server.inject(listRequest(), requestContextMock.convertContext(context));

    const ids = response.body.libraries.map(({ id }: { id: string }) => id);
    expect(ids).toEqual(['mine', 'shared']);
    expect(response.body.libraries.find(({ id }: { id: string }) => id === 'mine').scope).toBe(
      'space'
    );
  });

  it('never returns the secret or credentials embedded in the url', async () => {
    respondWith([
      libraryObject('custom', {
        title: 'Custom',
        provider: {
          type: 'git',
          url: 'https://user:hunter2@git.example.com/org/repo.git',
          username: 'user',
        },
        secret: 'super-secret-token',
      }),
    ]);

    const response = await server.inject(listRequest(), requestContextMock.convertContext(context));

    const serialized = JSON.stringify(response.body);
    expect(serialized).not.toContain('super-secret-token');
    expect(serialized).not.toContain('hunter2');
    expect(response.body.libraries[0].source_url).toBe('https://git.example.com/org/repo.git');
  });

  it('lists the built-in libraries first, then the others by title', async () => {
    respondWith([
      libraryObject('zeta', { title: 'Zeta' }),
      libraryObject('elastic-community', { title: 'Elastic Community Rules' }),
      libraryObject('alpha', { title: 'Alpha' }),
      libraryObject('elastic', { title: 'Prebuilt Security Detection Rules' }),
    ]);

    const response = await server.inject(listRequest(), requestContextMock.convertContext(context));

    expect(response.body.libraries.map(({ id }: { id: string }) => id)).toEqual([
      'elastic',
      'elastic-community',
      'alpha',
      'zeta',
    ]);
  });

  it('returns a 500 when listing fails', async () => {
    savedObjectsClient.find.mockRejectedValue(new Error('boom'));

    const response = await server.inject(listRequest(), requestContextMock.convertContext(context));

    expect(response.status).toEqual(500);
  });
});
