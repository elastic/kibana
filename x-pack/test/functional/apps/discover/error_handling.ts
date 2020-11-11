/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const toasts = getService('toasts');
  const PageObjects = getPageObjects(['common', 'discover', 'timePicker']);

  describe('errors', function describeIndexTests() {
    before(async function () {
      await esArchiver.loadIfNeeded('logstash_functional');
      await esArchiver.load('invalid_scripted_field');
      await PageObjects.timePicker.setDefaultAbsoluteRangeViaUiSettings();
      await PageObjects.common.navigateToApp('discover');
    });

    // this is the same test as in OSS but it catches different error message issue in different licences
    describe('invalid scripted field error', () => {
      it('is rendered', async () => {
        const toast = await toasts.getToastElement(1);
        const painlessStackTrace = await toast.findByTestSubject('painlessStackTrace');
        expect(painlessStackTrace).not.to.be(undefined);
      });
    });
  });
}
