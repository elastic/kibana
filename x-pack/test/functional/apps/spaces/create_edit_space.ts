/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects(['common', 'settings', 'security', 'spaceSelector']);
  const testSubjects = getService('testSubjects');

  describe('edit space', () => {
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    describe('solution view', () => {
      it('does not show solution view panel', async () => {
        await PageObjects.common.navigateToUrl('management', 'kibana/spaces/edit/default', {
          shouldUseHashForSubUrl: false,
        });

        await testSubjects.existOrFail('spaces-edit-page');
        await testSubjects.existOrFail('spaces-edit-page > generalPanel');
        await testSubjects.missingOrFail('spaces-edit-page > navigationPanel');
      });
    });
  });
}
