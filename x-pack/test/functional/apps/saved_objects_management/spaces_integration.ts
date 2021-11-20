/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

const getSpacePrefix = (spaceId: string) => {
  return spaceId && spaceId !== 'default' ? `/s/${spaceId}` : ``;
};

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const PageObjects = getPageObjects([
    'common',
    'security',
    'savedObjects',
    'spaceSelector',
    'settings',
  ]);
  const find = getService('find');
  const kibanaServer = getService('kibanaServer');
  const spacesService = getService('spaces');

  const spaceId = 'space_1';

  const textIncludesAll = (text: string, items: string[]) => {
    const bools = items.map((item) => !!text.includes(item));
    return bools.every((currBool) => currBool === true);
  };

  // FLAKY: https://github.com/elastic/kibana/issues/115303
  describe.skip('spaces integration', () => {
    before(async () => {
      await spacesService.create({ id: spaceId, name: spaceId });
      await kibanaServer.importExport.load(
        'x-pack/test/functional/fixtures/kbn_archiver/saved_objects_management/spaces_integration',
        { space: spaceId }
      );
    });

    after(async () => {
      await spacesService.delete(spaceId);
    });

    beforeEach(async () => {
      await PageObjects.common.navigateToUrl('settings', 'kibana/objects', {
        basePath: getSpacePrefix(spaceId),
        shouldUseHashForSubUrl: false,
      });
      await PageObjects.savedObjects.waitTableIsLoaded();
    });

    it('redirects to correct url when inspecting an object from a non-default space', async () => {
      const objects = await PageObjects.savedObjects.getRowTitles();
      expect(objects.includes('A Pie')).to.be(true);

      await PageObjects.savedObjects.clickInspectByTitle('A Pie');

      await PageObjects.common.waitUntilUrlIncludes(getSpacePrefix(spaceId));

      const inspectContainer = await find.byClassName('kibanaCodeEditor');
      const visibleContainerText = await inspectContainer.getVisibleText();
      expect(
        textIncludesAll(visibleContainerText, [
          'A Pie',
          'title',
          'id',
          'type',
          'attributes',
          'references',
        ])
      ).to.be(true);
      expect(visibleContainerText.includes('A Pie'));
    });
  });
}
