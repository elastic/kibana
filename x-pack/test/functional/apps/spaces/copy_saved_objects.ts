/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function spaceSelectorFunctonalTests({
  getService,
  getPageObjects,
}: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const spaces = getService('spaces');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['security', 'settings', 'copySavedObjectsToSpace']);

  // TODO: Flakey again https://github.com/elastic/kibana/issues/44575#issuecomment-528864287
  describe.skip('Copy Saved Objects to Space', function() {
    before(async () => {
      await esArchiver.load('spaces/copy_saved_objects');

      await spaces.create({
        id: 'marketing',
        name: 'Marketing',
        disabledFeatures: [],
      });

      await spaces.create({
        id: 'sales',
        name: 'Sales',
        disabledFeatures: [],
      });

      await PageObjects.security.login(null, null, {
        expectSpaceSelector: true,
      });

      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickKibanaSavedObjects();
    });

    after(async () => {
      await spaces.delete('sales');
      await spaces.delete('marketing');
      await esArchiver.unload('spaces/copy_saved_objects');
    });

    it('allows a dashboard to be copied to the marketing space, with all references', async () => {
      const destinationSpaceId = 'marketing';

      await PageObjects.copySavedObjectsToSpace.openCopyToSpaceFlyoutForObject('A Dashboard');

      await PageObjects.copySavedObjectsToSpace.setupForm({
        overwrite: true,
        destinationSpaceId,
      });

      await PageObjects.copySavedObjectsToSpace.startCopy();

      // Wait for successful copy
      await testSubjects.waitForDeleted(`cts-summary-indicator-loading-${destinationSpaceId}`);
      await testSubjects.existOrFail(`cts-summary-indicator-success-${destinationSpaceId}`);

      const summaryCounts = await PageObjects.copySavedObjectsToSpace.getSummaryCounts();

      expect(summaryCounts).to.eql({
        copied: 3,
        skipped: 0,
        errors: 0,
        overwrite: undefined,
      });

      await PageObjects.copySavedObjectsToSpace.finishCopy();
    });

    it('allows conflicts to be resolved', async () => {
      const destinationSpaceId = 'sales';

      await PageObjects.copySavedObjectsToSpace.openCopyToSpaceFlyoutForObject('A Dashboard');

      await PageObjects.copySavedObjectsToSpace.setupForm({
        overwrite: false,
        destinationSpaceId,
      });

      await PageObjects.copySavedObjectsToSpace.startCopy();

      // Wait for successful copy with conflict warning
      await testSubjects.waitForDeleted(`cts-summary-indicator-loading-${destinationSpaceId}`);
      await testSubjects.existOrFail(`cts-summary-indicator-conflicts-${destinationSpaceId}`);

      const summaryCounts = await PageObjects.copySavedObjectsToSpace.getSummaryCounts();

      expect(summaryCounts).to.eql({
        copied: 2,
        skipped: 1,
        errors: 0,
        overwrite: undefined,
      });

      // Mark conflict for overwrite
      await testSubjects.click(`cts-space-result-${destinationSpaceId}`);
      await testSubjects.click(`cts-overwrite-conflict-logstash-*`);

      // Verify summary changed
      const updatedSummaryCounts = await PageObjects.copySavedObjectsToSpace.getSummaryCounts(true);

      expect(updatedSummaryCounts).to.eql({
        copied: 2,
        skipped: 0,
        overwrite: 1,
        errors: 0,
      });

      await PageObjects.copySavedObjectsToSpace.finishCopy();
    });
  });
}
