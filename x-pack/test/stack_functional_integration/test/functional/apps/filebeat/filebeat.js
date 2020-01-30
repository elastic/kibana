/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

export default function({ getService, getPageObjects }) {
  describe('check filebeat', function() {
    const log = getService('log');
    const retry = getService('retry');
    const PageObjects = getPageObjects(['common', 'discover', 'timePicker']);

    it('filebeat- should have hit count GT 0', async function() {
      log.debug('navigateToApp Discover');
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.discover.selectIndexPattern('filebeat-*');
      await PageObjects.timePicker.setCommonlyUsedTime('superDatePickerCommonlyUsed_Today');
      await retry.try(async () => {
        const hitCount = parseInt(await PageObjects.discover.getHitCount());
        expect(hitCount).to.be.greaterThan(0);
      });
    });
  });
}
