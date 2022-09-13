/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';

const SPACE_1 = {
  id: 'space_1',
  name: 'Space 1',
  description: 'This is the first test space',
  disabledFeatures: [],
};

const SPACE_2 = {
  id: 'space_2',
  name: 'Space 2',
  description: 'This is the second test space',
  disabledFeatures: [],
};

// Objects can only be imported in one space at a time. To have test saved objects
// that are shared in multiple spaces we should import all objects in the "original"
// spaces first and then share them to other spaces as a subsequent operation.
const OBJECTS_TO_SHARE: Array<{
  spacesToAdd?: string[];
  spacesToRemove?: string[];
  objects: Array<{ type: string; id: string }>;
}> = [
  {
    spacesToAdd: ['*'],
    spacesToRemove: ['default'],
    objects: [
      { type: 'sharedtype', id: 'all_spaces' },
      { type: 'sharedtype', id: 'space_2_only_matching_origin' },
      { type: 'sharedtype', id: 'alias_delete_exclusive' },
    ],
  },
  {
    spacesToRemove: ['default'],
    spacesToAdd: [SPACE_1.id, SPACE_2.id],
    objects: [{ type: 'sharedtype', id: 'space_1_and_space_2' }],
  },
  {
    spacesToAdd: [SPACE_1.id, SPACE_2.id],
    objects: [
      { type: 'sharedtype', id: 'each_space' },
      { type: 'sharedtype', id: 'conflict_2_all' },
      { type: 'sharedtype', id: 'alias_delete_inclusive' },
    ],
  },
  {
    spacesToAdd: [SPACE_1.id],
    objects: [
      { type: 'sharedtype', id: 'conflict_1c_default_and_space_1' },
      { type: 'sharedtype', id: 'default_and_space_1' },
    ],
  },
  {
    spacesToAdd: [SPACE_2.id],
    objects: [{ type: 'sharedtype', id: 'default_and_space_2' }],
  },
];

export function getTestDataLoader({ getService }: FtrProviderContext) {
  const spacesService = getService('spaces');
  const kbnServer = getService('kibanaServer');
  const supertest = getService('supertest');
  const log = getService('log');

  return {
    before: async () => {
      await Promise.all([await spacesService.create(SPACE_1), await spacesService.create(SPACE_2)]);
    },

    after: async () => {
      await Promise.all([spacesService.delete(SPACE_1.id), spacesService.delete(SPACE_2.id)]);
    },

    beforeEach: async () => {
      log.debug('Loading test data for the following spaces: default, space_1 and space_2');
      await Promise.all([
        kbnServer.importExport.load(
          'x-pack/test/spaces_api_integration/common/fixtures/kbn_archiver/default_space.json'
        ),
        kbnServer.importExport.load(
          'x-pack/test/spaces_api_integration/common/fixtures/kbn_archiver/space_1.json',
          { space: SPACE_1.id }
        ),
        kbnServer.importExport.load(
          'x-pack/test/spaces_api_integration/common/fixtures/kbn_archiver/space_2.json',
          { space: SPACE_2.id }
        ),
      ]);

      // Adjust spaces for the imported saved objects.
      for (const { objects, spacesToAdd = [], spacesToRemove = [] } of OBJECTS_TO_SHARE) {
        log.debug(
          `Updating spaces for the following objects (add: [${spacesToAdd.join(
            ', '
          )}], remove: [${spacesToRemove.join(', ')}]): ${objects
            .map(({ type, id }) => `${type}:${id}`)
            .join(', ')}`
        );
        await supertest
          .post('/api/spaces/_update_objects_spaces')
          .send({ objects, spacesToAdd, spacesToRemove })
          .expect(200);
      }
    },

    afterEach: async () => {
      const allSpacesIds = [
        ...(await spacesService.getAll()).map((space) => space.id),
        'non_existent_space',
      ];
      log.debug(`Removing data from the following spaces: ${allSpacesIds.join(', ')}`);
      await Promise.all(
        allSpacesIds.flatMap((spaceId) => [
          kbnServer.savedObjects.cleanStandardList({ space: spaceId }),
          kbnServer.savedObjects.clean({ space: spaceId, types: ['sharedtype', 'isolatedtype'] }),
        ])
      );
    },
  };
}
