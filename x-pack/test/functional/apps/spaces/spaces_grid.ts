/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function enterSpaceFunctionalTests({
  getService,
  getPageObjects,
}: FtrProviderContext) {
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects(['security', 'spaceSelector', 'common']);
  const spacesService = getService('spaces');
  const testSubjects = getService('testSubjects');

  const anotherSpace = {
    id: 'space2',
    name: 'space2',
    disabledFeatures: [],
  };

  describe('Spaces grid', function () {
    before(async () => {
      await spacesService.create(anotherSpace);

      await PageObjects.common.navigateToApp('spacesManagement');
      await testSubjects.existOrFail('spaces-grid-page');
    });

    after(async () => {
      await spacesService.delete('another-space');
      await kibanaServer.savedObjects.cleanStandardList();
    });

    it('can switch to a space from the row in the grid', async () => {
      // use the "current" badge confirm that Default is the current space
      await testSubjects.existOrFail('spacesListCurrentBadge-default');
      // click the switch button of "another space"
      await PageObjects.spaceSelector.clickSwitchSpaceButton('space2');
      // use the "current" badge confirm that "Another Space" is now the current space
      await testSubjects.existOrFail('spacesListCurrentBadge-space2');
    });
  });
}
