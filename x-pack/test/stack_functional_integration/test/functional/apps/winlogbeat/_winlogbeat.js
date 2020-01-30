/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

export default function({ getService, getPageObjects }) {
  const PageObjects = getPageObjects(['header', 'common', 'settings', 'visualize', 'visChart']);
  const retry = getService('retry');

  describe('check winlogbeat', function() {
    it('winlogbeat- should have hit count GT 0', async function() {
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.discover.selectIndexPattern('winlogbeat-*');
      await PageObjects.timePicker.setCommonlyUsedTime('superDatePickerCommonlyUsed_Today');
      await retry.try(async function() {
        const hitCount = parseInt(await PageObjects.discover.getHitCount());
        expect(hitCount).to.be.greaterThan(0);
      });
    });
  });
}
