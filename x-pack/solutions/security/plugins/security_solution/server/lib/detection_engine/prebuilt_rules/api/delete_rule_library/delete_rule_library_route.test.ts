/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { DELETE_RULE_LIBRARY_URL } from '../../../../../../common/api/detection_engine/prebuilt_rules';
import { createPrebuiltRuleObjectsClient } from '../../logic/rule_objects/prebuilt_rule_objects_client';
import { requestContextMock, requestMock, serverMock } from '../../../routes/__mocks__';
import { deleteRuleLibraryRoute } from './delete_rule_library_route';

jest.mock('../../logic/rule_objects/prebuilt_rule_objects_client', () => ({
  createPrebuiltRuleObjectsClient: jest.fn(),
}));

const createRequest = (libraryId: string, query: Record<string, string> = {}) =>
  requestMock.create({
    method: 'delete',
    path: DELETE_RULE_LIBRARY_URL,
    params: { library_id: libraryId },
    query,
  });

const noAssets = {
  find: async function* find() {
    yield { saved_objects: [] as never[] };
  },
  close: jest.fn().mockResolvedValue(undefined),
};
const assetPage = (...versions: Array<[string, number]>) => ({
  find: async function* find() {
    yield {
      saved_objects: versions.map(([ruleId, version]) => ({
        id: `${ruleId}_${version}`,
        type: 'security-rule',
        attributes: { rule_id: ruleId, version },
        references: [],
        score: 0,
      })),
    };
  },
  close: jest.fn().mockResolvedValue(undefined),
});

const library = (id: string, attributes: Record<string, unknown> = {}) => ({
  id,
  type: 'security-rule-library',
  attributes,
  references: [],
  score: 0,
});

describe('deleteRuleLibraryRoute', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();
  const savedObjectsClient = savedObjectsClientMock.create();

  const inject = (libraryId: string, query: Record<string, string> = {}) =>
    server.inject(createRequest(libraryId, query), requestContextMock.convertContext(context));

  const mockFind = (...results: Array<ReturnType<typeof library>>) =>
    savedObjectsClient.find.mockImplementation((options) =>
      Promise.resolve({
        saved_objects: options.type === 'security-rule-library' ? results : [],
        total: results.length,
        per_page: 1000,
        page: 1,
      } as never)
    );

  beforeEach(() => {
    jest.clearAllMocks();
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());
    clients.core.savedObjects.getClient = jest.fn(() => savedObjectsClient);
    savedObjectsClient.delete.mockResolvedValue({} as never);
    savedObjectsClient.createPointInTimeFinder.mockReturnValue(noAssets as never);
    jest.mocked(createPrebuiltRuleObjectsClient).mockReturnValue({
      fetchInstalledRuleVersions: jest.fn().mockResolvedValue([]),
    } as never);
    deleteRuleLibraryRoute(server.router, clients.logger);
  });

  it('removes the library and returns how many assets went with it', async () => {
    mockFind(library('custom-1'));

    const response = await inject('custom-1');

    expect(response.status).toEqual(200);
    expect(response.body).toEqual({ id: 'custom-1', deleted_assets: 0 });
    expect(savedObjectsClient.delete).toHaveBeenCalledWith('security-rule-library', 'custom-1');
  });

  it('removes a library of the current space', async () => {
    mockFind(library('custom-1', { space_id: 'default' }));

    expect((await inject('custom-1')).status).toEqual(200);
  });

  it('does not remove a library that belongs to another space', async () => {
    mockFind(library('custom-1', { space_id: 'other' }));

    const response = await inject('custom-1');

    expect(response.status).toEqual(404);
    expect(savedObjectsClient.delete).not.toHaveBeenCalled();
  });

  it('answers 404 for a library that does not exist', async () => {
    mockFind();

    expect((await inject('missing')).status).toEqual(404);
  });

  it('refuses to remove a built-in library', async () => {
    const response = await inject('elastic');

    expect(response.status).toEqual(400);
    expect(savedObjectsClient.delete).not.toHaveBeenCalled();
  });

  describe('rule versions', () => {
    const mockInstalledRules = (
      ...rules: Array<{ rule_id: string; version: number; library_id?: string }>
    ) =>
      jest.mocked(createPrebuiltRuleObjectsClient).mockReturnValue({
        fetchInstalledRuleVersions: jest.fn().mockResolvedValue(rules),
      } as never);

    const mockAssets = (...deletedIds: string[]) => {
      savedObjectsClient.createPointInTimeFinder.mockReturnValue(
        assetPage(['a', 1], ['a', 2], ['b', 1]) as never
      );
      savedObjectsClient.bulkDelete.mockResolvedValue({
        statuses: deletedIds.map((id) => ({ id, type: 'security-rule', success: true })),
      } as never);
    };

    describe('of a shared library', () => {
      beforeEach(() => {
        mockFind(library('custom-1'));
        mockInstalledRules({ rule_id: 'a', version: 2, library_id: 'custom-1' });
        mockAssets('a_1', 'a_2', 'b_1');
      });

      it('removes them with the library by default, installed or not', async () => {
        const response = await inject('custom-1');

        expect(response.body).toEqual({ id: 'custom-1', deleted_assets: 3 });
        expect(savedObjectsClient.bulkDelete).toHaveBeenCalledWith([
          { type: 'security-rule', id: 'a_1' },
          { type: 'security-rule', id: 'a_2' },
          { type: 'security-rule', id: 'b_1' },
        ]);
      });

      it('keeps all of them when asked to, and still removes the library', async () => {
        const response = await inject('custom-1', { keep_rule_versions: 'true' });

        expect(response.status).toEqual(200);
        expect(response.body).toEqual({ id: 'custom-1', deleted_assets: 0 });
        expect(savedObjectsClient.bulkDelete).not.toHaveBeenCalled();
        expect(savedObjectsClient.delete).toHaveBeenCalledWith('security-rule-library', 'custom-1');
      });
    });

    describe('of a space library', () => {
      beforeEach(() => {
        mockFind(library('custom-1', { space_id: 'default' }));
        mockInstalledRules(
          { rule_id: 'a', version: 2, library_id: 'custom-1' },
          { rule_id: 'b', version: 1, library_id: 'other-library' },
          { rule_id: 'b', version: 1 }
        );
        mockAssets('a_1', 'b_1');
      });

      it('removes all of them except the ones that rules of the library are installed on', async () => {
        const response = await inject('custom-1');

        expect(response.body).toEqual({ id: 'custom-1', deleted_assets: 2 });
        expect(savedObjectsClient.bulkDelete).toHaveBeenCalledWith([
          { type: 'security-rule', id: 'a_1' },
          { type: 'security-rule', id: 'b_1' },
        ]);
      });

      it('does the same when asked to keep every version, since that choice is not offered', async () => {
        await inject('custom-1', { keep_rule_versions: 'true' });

        expect(savedObjectsClient.bulkDelete).toHaveBeenCalledTimes(1);
      });
    });
  });
});
