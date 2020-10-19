/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

const getSpacePrefix = (spaceId: string) => {
  return spaceId && spaceId !== 'default' ? `/s/${spaceId}` : ``;
};

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects([
    'common',
    'security',
    'savedObjects',
    'spaceSelector',
    'settings',
  ]);

  const spaceId = 'space_1';

  describe('TOTO spaces integration', () => {
    before(async () => {
      await esArchiver.load('saved_objects_management/spaces_integration');
    });

    after(async () => {
      await esArchiver.unload('saved_objects_management/spaces_integration');
    });

    beforeEach(async () => {
      await PageObjects.common.navigateToApp('settings', { basePath: getSpacePrefix(spaceId) });
      await PageObjects.settings.clickKibanaSavedObjects();
    });

    it('redirects to correct url when inspecting an object from a non-default space', async () => {
      const objects = await PageObjects.savedObjects.getRowTitles();
      expect(objects.includes('A Pie')).to.be(true);

      await PageObjects.savedObjects.clickInspectByTitle('A Pie');

      await PageObjects.common.waitUntilUrlIncludes(
        '/s/space_1/app/management/kibana/objects/savedVisualizations/75c3e060-1e7c-11e9-8488-65449e65d0ed'
      );

      expect(await testSubjects.getAttribute(`savedObjects-editField-title`, 'value')).to.eql(
        'A Pie'
      );
    });
  });
}
