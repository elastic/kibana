/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { GET_RULE_LIBRARY_RULE_URL } from '../../../../../../common/api/detection_engine/prebuilt_rules';
import { requestContextMock, requestMock, serverMock } from '../../../routes/__mocks__';
import { convertPrebuiltRuleAssetToRuleResponse } from '../../../rule_management/logic/detection_rules_client/converters/convert_prebuilt_rule_asset_to_rule_response';
import { createPrebuiltRuleAssetsClient } from '../../logic/rule_assets/prebuilt_rule_assets_client';
import { createPrebuiltRuleObjectsClient } from '../../logic/rule_objects/prebuilt_rule_objects_client';
import { getRuleLibraryRuleRoute } from './get_rule_library_rule_route';

jest.mock(
  '../../../rule_management/logic/detection_rules_client/converters/convert_prebuilt_rule_asset_to_rule_response',
  () => ({ convertPrebuiltRuleAssetToRuleResponse: jest.fn() })
);
jest.mock('../../logic/rule_assets/prebuilt_rule_assets_client', () => ({
  createPrebuiltRuleAssetsClient: jest.fn(),
}));
jest.mock('../../logic/rule_objects/prebuilt_rule_objects_client', () => ({
  createPrebuiltRuleObjectsClient: jest.fn(),
}));

const getRequest = (query: Record<string, string>) =>
  requestMock.create({ method: 'get', path: GET_RULE_LIBRARY_RULE_URL, query });

const libraryObject = (id: string, title: string, spaceId?: string) => ({
  id,
  type: 'security-rule-library',
  references: [],
  score: 1,
  attributes: {
    name: id,
    title,
    provider: { type: 'git' as const },
    ...(spaceId ? { space_id: spaceId } : {}),
  },
});

describe('getRuleLibraryRuleRoute', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();
  const savedObjectsClient = savedObjectsClientMock.create();
  const fetchLatestVersions = jest.fn();
  const fetchAssetsByVersion = jest.fn();
  const fetchInstalledRuleVersionsByIds = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());
    clients.core.savedObjects.getClient = jest.fn(() => savedObjectsClient);
    savedObjectsClient.find.mockResolvedValue({
      saved_objects: [
        libraryObject('elastic', 'Prebuilt Security Detection Rules'),
        libraryObject('elastic-community', 'Elastic Community Rules'),
        libraryObject('theirs', 'Theirs', 'other'),
      ],
      total: 3,
      per_page: 1000,
      page: 1,
    });
    fetchLatestVersions.mockResolvedValue([
      { rule_id: 'a', version: 2, library_id: 'elastic-community' },
    ]);
    fetchAssetsByVersion.mockResolvedValue({ assets: [{ rule_id: 'a', version: 2 }] });
    fetchInstalledRuleVersionsByIds.mockResolvedValue([]);
    jest.mocked(createPrebuiltRuleAssetsClient).mockReturnValue({
      fetchLatestVersions,
      fetchAssetsByVersion,
    } as unknown as ReturnType<typeof createPrebuiltRuleAssetsClient>);
    jest.mocked(createPrebuiltRuleObjectsClient).mockReturnValue({
      fetchInstalledRuleVersionsByIds,
    } as unknown as ReturnType<typeof createPrebuiltRuleObjectsClient>);
    jest
      .mocked(convertPrebuiltRuleAssetToRuleResponse)
      .mockReturnValue({ rule_id: 'a', name: 'Rule A' } as never);
    getRuleLibraryRuleRoute(server.router, clients.logger);
  });

  it('returns the latest version of the rule in the requested library', async () => {
    const response = await server.inject(
      getRequest({ library_id: 'elastic-community', rule_id: 'a' }),
      requestContextMock.convertContext(context)
    );

    expect(response.status).toEqual(200);
    expect(response.body.rule).toEqual({ rule_id: 'a', name: 'Rule A' });
    expect(response.body.install_state).toBe('installable');
    expect(fetchLatestVersions).toHaveBeenCalledWith({
      ruleIds: ['a'],
      libraryIds: ['elastic-community'],
    });
  });

  it('reports a rule that is installed from the same library as installed', async () => {
    fetchInstalledRuleVersionsByIds.mockResolvedValue([
      { id: 'so', rule_id: 'a', version: 2, tags: [], library_id: 'elastic-community' },
    ]);

    const response = await server.inject(
      getRequest({ library_id: 'elastic-community', rule_id: 'a' }),
      requestContextMock.convertContext(context)
    );

    expect(response.body.install_state).toBe('installed');
  });

  it('names the library when the rule is installed from another one', async () => {
    fetchInstalledRuleVersionsByIds.mockResolvedValue([
      { id: 'so', rule_id: 'a', version: 2, tags: [] },
    ]);

    const response = await server.inject(
      getRequest({ library_id: 'elastic-community', rule_id: 'a' }),
      requestContextMock.convertContext(context)
    );

    expect(response.body.install_state).toBe('installed_from_other_library');
    expect(response.body.installed_from_library).toEqual({
      id: 'elastic',
      title: 'Prebuilt Security Detection Rules',
    });
  });

  it('returns 404 for a library that does not exist or belongs to another space', async () => {
    const response = await server.inject(
      getRequest({ library_id: 'theirs', rule_id: 'a' }),
      requestContextMock.convertContext(context)
    );

    expect(response.status).toEqual(404);
    expect(fetchLatestVersions).not.toHaveBeenCalled();
  });

  it('returns 404 when the rule is not in the library', async () => {
    fetchLatestVersions.mockResolvedValue([]);

    const response = await server.inject(
      getRequest({ library_id: 'elastic', rule_id: 'missing' }),
      requestContextMock.convertContext(context)
    );

    expect(response.status).toEqual(404);
    expect(fetchAssetsByVersion).not.toHaveBeenCalled();
  });

  it('requires both ids and bounds their length', () => {
    expect(server.validate(getRequest({ library_id: 'elastic' })).badRequest).toHaveBeenCalled();
  });

  it('rejects a rule id that is too long', () => {
    const result = server.validate(getRequest({ library_id: 'elastic', rule_id: 'a'.repeat(257) }));

    expect(result.badRequest).toHaveBeenCalled();
  });
});
