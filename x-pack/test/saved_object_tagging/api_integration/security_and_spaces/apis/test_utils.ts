/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../services';

export const createTestSpaces = async ({ getService }: FtrProviderContext) => {
  const spaceService = getService('spaces');
  await spaceService.create({
    id: 'space_1',
    name: 'Space 1',
    description: 'This is the first test space',
  });
  await spaceService.create({
    id: 'space_2',
    name: 'Space 2',
    description: 'This is the second test space',
  });
};

export const deleteTestSpaces = async ({ getService }: FtrProviderContext) => {
  const spaceService = getService('spaces');
  await spaceService.delete('space_1');
  await spaceService.delete('space_2');
};

export const createTags = async ({ getService }: FtrProviderContext) => {
  const kibanaServer = getService('kibanaServer');
  await kibanaServer.importExport.load(
    'x-pack/test/saved_object_tagging/common/fixtures/es_archiver/rbac_tags/default_space.json'
  );
  await kibanaServer.importExport.load(
    'x-pack/test/saved_object_tagging/common/fixtures/es_archiver/rbac_tags/space_1.json',
    { space: 'space_1' }
  );
};

export const deleteTags = async ({ getService }: FtrProviderContext) => {
  const kibanaServer = getService('kibanaServer');
  while (true) {
    const defaultTags = await kibanaServer.savedObjects.find({ type: 'tag', space: 'default' });
    const spaceTags = await kibanaServer.savedObjects.find({ type: 'tag', space: 'space_1' });
    if (defaultTags.saved_objects.length === 0 && spaceTags.saved_objects.length === 0) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      break;
    }
    if (defaultTags.saved_objects.length !== 0) {
      await kibanaServer.savedObjects.bulkDelete({
        objects: defaultTags.saved_objects.map(({ type, id }) => ({ type, id })),
      });
    }
    if (spaceTags.saved_objects.length !== 0) {
      await kibanaServer.savedObjects.bulkDelete({
        objects: spaceTags.saved_objects.map(({ type, id }) => ({ type, id })),
        space: 'space_1',
      });
    }
  }
};
