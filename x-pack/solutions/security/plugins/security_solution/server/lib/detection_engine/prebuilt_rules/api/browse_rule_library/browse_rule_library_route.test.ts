/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { BROWSE_RULE_LIBRARY_URL } from '../../../../../../common/api/detection_engine/prebuilt_rules';
import { requestContextMock, requestMock, serverMock } from '../../../routes/__mocks__';
import { browseRuleLibrary } from '../../logic/browse_rule_library';
import { createPrebuiltRuleObjectsClient } from '../../logic/rule_objects/prebuilt_rule_objects_client';
import { browseRuleLibraryRoute } from './browse_rule_library_route';

jest.mock('../../logic/browse_rule_library', () => ({
  ...jest.requireActual('../../logic/browse_rule_library'),
  browseRuleLibrary: jest.fn(),
}));
jest.mock('../../logic/rule_assets/prebuilt_rule_assets_client');
jest.mock('../../logic/rule_objects/prebuilt_rule_objects_client', () => ({
  createPrebuiltRuleObjectsClient: jest.fn(),
}));

const browseRequest = (body: Record<string, unknown>) =>
  requestMock.create({ method: 'post', path: BROWSE_RULE_LIBRARY_URL, body });

const libraryObject = (id: string, spaceId?: string) => ({
  id,
  type: 'security-rule-library',
  references: [],
  score: 1,
  attributes: {
    name: id,
    title: `${id} title`,
    provider: { type: 'git' as const },
    ...(spaceId ? { space_id: spaceId } : {}),
  },
});

describe('browseRuleLibraryRoute', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();
  const savedObjectsClient = savedObjectsClientMock.create();

  beforeEach(() => {
    jest.clearAllMocks();
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());
    clients.core.savedObjects.getClient = jest.fn(() => savedObjectsClient);
    savedObjectsClient.find.mockResolvedValue({
      saved_objects: [libraryObject('elastic'), libraryObject('elastic-community')],
      total: 2,
      per_page: 1000,
      page: 1,
    });
    jest.mocked(createPrebuiltRuleObjectsClient).mockReturnValue({
      fetchInstalledRuleVersions: jest.fn().mockResolvedValue([]),
    } as unknown as ReturnType<typeof createPrebuiltRuleObjectsClient>);
    jest
      .mocked(browseRuleLibrary)
      .mockResolvedValue({ rules: [], total: 0, page: 1, per_page: 10 });
    browseRuleLibraryRoute(server.router, clients.logger);
  });

  it('browses every visible library when none is given', async () => {
    const response = await server.inject(
      browseRequest({}),
      requestContextMock.convertContext(context)
    );

    expect(response.status).toEqual(200);
    const [params] = jest.mocked(browseRuleLibrary).mock.calls[0];
    expect(params.libraryIds).toEqual(['elastic', 'elastic-community']);
    expect(params.page).toBe(1);
    expect(params.perPage).toBe(10);
  });

  it('browses only the requested library', async () => {
    await server.inject(
      browseRequest({ library_id: 'elastic-community' }),
      requestContextMock.convertContext(context)
    );

    expect(jest.mocked(browseRuleLibrary).mock.calls[0][0].libraryIds).toEqual([
      'elastic-community',
    ]);
  });

  it('returns 404 for a library that does not exist or belongs to another space', async () => {
    savedObjectsClient.find.mockResolvedValue({
      saved_objects: [libraryObject('theirs', 'other')],
      total: 1,
      per_page: 1000,
      page: 1,
    });

    const response = await server.inject(
      browseRequest({ library_id: 'theirs' }),
      requestContextMock.convertContext(context)
    );

    expect(response.status).toEqual(404);
    expect(browseRuleLibrary).not.toHaveBeenCalled();
  });

  it('rejects a page size above the limit', () => {
    const result = server.validate(browseRequest({ per_page: 101 }));

    expect(result.badRequest).toHaveBeenCalled();
  });

  it('rejects a search that is too long', () => {
    const result = server.validate(browseRequest({ search: 'a'.repeat(257) }));

    expect(result.badRequest).toHaveBeenCalled();
  });

  it('rejects tactics that are not ids, or too many of them', () => {
    const invalid = server.validate(browseRequest({ tactics: ['TA0002" or *'] }));
    expect(invalid.badRequest).toHaveBeenCalled();

    const tooMany = serverMock.create();
    browseRuleLibraryRoute(tooMany.router, clients.logger);
    const result = tooMany.validate(
      browseRequest({ tactics: Array.from({ length: 21 }, (_, i) => `TA${i}`) })
    );
    expect(result.badRequest).toHaveBeenCalled();
  });

  it('rejects empty or too many tags', () => {
    expect(server.validate(browseRequest({ tags: [''] })).badRequest).toHaveBeenCalled();

    const tooMany = serverMock.create();
    browseRuleLibraryRoute(tooMany.router, clients.logger);
    const result = tooMany.validate(
      browseRequest({ tags: Array.from({ length: 21 }, (_, i) => `tag ${i}`) })
    );
    expect(result.badRequest).toHaveBeenCalled();
  });

  it('passes the tags on', async () => {
    await server.inject(
      browseRequest({ tags: ['OS: Linux'] }),
      requestContextMock.convertContext(context)
    );

    expect(jest.mocked(browseRuleLibrary).mock.calls[0][0].tags).toEqual(['OS: Linux']);
  });

  it('passes the tactics on', async () => {
    await server.inject(
      browseRequest({ tactics: ['TA0002'] }),
      requestContextMock.convertContext(context)
    );

    expect(jest.mocked(browseRuleLibrary).mock.calls[0][0].tactics).toEqual(['TA0002']);
  });

  it('accepts the defaults', () => {
    const result = server.validate(browseRequest({}));

    expect(result.badRequest).not.toHaveBeenCalled();
  });
});
