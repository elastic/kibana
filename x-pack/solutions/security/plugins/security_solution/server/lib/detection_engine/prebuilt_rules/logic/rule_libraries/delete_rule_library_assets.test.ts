/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { deleteRuleLibraryAssets, toAssetVersionKey } from './delete_rule_library_assets';

const asset = (ruleId: string, version: number) => ({
  id: `lib-1_${ruleId}_${version}`,
  type: 'security-rule',
  attributes: { rule_id: ruleId, version },
  references: [],
  score: 0,
});

const pages = (...assetPages: Array<Array<ReturnType<typeof asset>>>) => ({
  find: async function* find() {
    for (const savedObjects of assetPages) {
      yield { saved_objects: savedObjects };
    }
  },
  close: jest.fn().mockResolvedValue(undefined),
});

const deleted = (ids: string[], success = true) =>
  ({ statuses: ids.map((id) => ({ id, type: 'security-rule', success })) } as never);

describe('deleteRuleLibraryAssets', () => {
  const client = savedObjectsClientMock.create();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('removes every asset of the library', async () => {
    const finder = pages([asset('a', 1), asset('a', 2)], [asset('b', 1)]);
    client.createPointInTimeFinder.mockReturnValue(finder as never);
    client.bulkDelete
      .mockResolvedValueOnce(deleted(['x', 'y']))
      .mockResolvedValueOnce(deleted(['z']));

    await expect(deleteRuleLibraryAssets(client, 'lib-1')).resolves.toEqual(3);
    expect(client.bulkDelete).toHaveBeenNthCalledWith(1, [
      { type: 'security-rule', id: 'lib-1_a_1' },
      { type: 'security-rule', id: 'lib-1_a_2' },
    ]);
    expect(finder.close).toHaveBeenCalled();
  });

  it('spares the versions to keep', async () => {
    client.createPointInTimeFinder.mockReturnValue(
      pages([asset('a', 1), asset('a', 2)], [asset('b', 1)]) as never
    );
    client.bulkDelete.mockResolvedValueOnce(deleted(['x']));

    const result = await deleteRuleLibraryAssets(
      client,
      'lib-1',
      new Set([toAssetVersionKey('a', 2), toAssetVersionKey('b', 1)])
    );

    expect(result).toEqual(1);
    expect(client.bulkDelete).toHaveBeenCalledTimes(1);
    expect(client.bulkDelete).toHaveBeenCalledWith([{ type: 'security-rule', id: 'lib-1_a_1' }]);
  });

  it('only looks at assets of the given library', async () => {
    client.createPointInTimeFinder.mockReturnValue(pages() as never);

    await deleteRuleLibraryAssets(client, 'lib"1');

    expect(client.createPointInTimeFinder).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'security-rule',
        filter: 'security-rule.attributes.library_id: "lib\\"1"',
      })
    );
  });

  it('fails, and closes the finder, when an asset could not be removed', async () => {
    const finder = pages([asset('a', 1)]);
    client.createPointInTimeFinder.mockReturnValue(finder as never);
    client.bulkDelete.mockResolvedValueOnce(deleted(['x'], false));

    await expect(deleteRuleLibraryAssets(client, 'lib-1')).rejects.toThrow(/Failed to remove/);
    expect(finder.close).toHaveBeenCalled();
  });
});
