/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { getLifecycleMethods } from './_get_lifecycle_methods';

export default function({ getService, getPageObjects }) {
  const PageObjects = getPageObjects(['header', 'timePicker']);
  const testSubjects = getService('testSubjects');
  const clusterList = getService('monitoringClusterList');

  describe('Timefilter', () => {
    const { setup, tearDown } = getLifecycleMethods(getService, getPageObjects);

    before(async () => {
      await setup('monitoring/multicluster', {
        from: 'Aug 15, 2017 @ 21:00:00.000',
        to: 'Aug 16, 2017 @ 00:00:00.000',
      });
      await clusterList.assertDefaults();
    });

    after(async () => {
      await tearDown();
    });

    // FLAKY: https://github.com/elastic/kibana/issues/48910
    it.skip('should send another request when clicking Refresh', async () => {
      await testSubjects.click('querySubmitButton');
      const isLoading = await PageObjects.header.isGlobalLoadingIndicatorVisible();
      expect(isLoading).to.be(true);
    });

    it('should send another request when changing the time picker', async () => {
      await PageObjects.timePicker.setAbsoluteRange(
        'Aug 15, 2016 @ 21:00:00.000',
        'Aug 16, 2016 @ 00:00:00.000'
      );
      await clusterList.assertNoData();
    });
  });
}
