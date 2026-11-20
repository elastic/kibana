/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { LIST_RULE_LIBRARY_TAGS_URL } from '../../../../../../common/api/detection_engine/prebuilt_rules';
import { requestContextMock, requestMock, serverMock } from '../../../routes/__mocks__';
import { createPrebuiltRuleAssetsClient } from '../../logic/rule_assets/prebuilt_rule_assets_client';
import { listRuleLibraryTagsRoute } from './list_rule_library_tags_route';

jest.mock('../../logic/rule_assets/prebuilt_rule_assets_client', () => ({
  createPrebuiltRuleAssetsClient: jest.fn(),
}));

const tagsRequest = (query: Record<string, string> = {}) =>
  requestMock.create({ method: 'get', path: LIST_RULE_LIBRARY_TAGS_URL, query });

const libraryObject = (id: string, spaceId?: string) => ({
  id,
  type: 'security-rule-library',
  references: [],
  score: 1,
  attributes: {
    name: id,
    title: id,
    provider: { type: 'git' as const },
    ...(spaceId ? { space_id: spaceId } : {}),
  },
});

describe('listRuleLibraryTagsRoute', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();
  const savedObjectsClient = savedObjectsClientMock.create();
  const fetchTagsByLibraries = jest.fn();

  const inject = (query?: Record<string, string>) =>
    server.inject(tagsRequest(query), requestContextMock.convertContext(context));

  beforeEach(() => {
    jest.clearAllMocks();
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());
    clients.core.savedObjects.getClient = jest.fn(() => savedObjectsClient);
    savedObjectsClient.find.mockResolvedValue({
      saved_objects: [
        libraryObject('elastic'),
        libraryObject('custom'),
        libraryObject('theirs', 'other'),
      ],
      total: 3,
      per_page: 1000,
      page: 1,
    });
    fetchTagsByLibraries.mockResolvedValue(['OS: Linux']);
    jest.mocked(createPrebuiltRuleAssetsClient).mockReturnValue({
      fetchTagsByLibraries,
    } as unknown as ReturnType<typeof createPrebuiltRuleAssetsClient>);
    listRuleLibraryTagsRoute(server.router, clients.logger);
  });

  it('lists the tags of the requested library', async () => {
    const response = await inject({ library_id: 'custom' });

    expect(response.status).toEqual(200);
    expect(response.body).toEqual({ tags: ['OS: Linux'] });
    expect(fetchTagsByLibraries).toHaveBeenCalledWith(['custom']);
  });

  it('lists the tags of every library you can see when none is requested', async () => {
    await inject();

    expect(fetchTagsByLibraries).toHaveBeenCalledWith(['elastic', 'custom']);
  });

  it('returns 404 for a library that does not exist or belongs to another space', async () => {
    const response = await inject({ library_id: 'theirs' });

    expect(response.status).toEqual(404);
    expect(fetchTagsByLibraries).not.toHaveBeenCalled();
  });
});
