/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const toasts = getService('toasts');
  const PageObjects = getPageObjects(['common', 'discover', 'timePicker']);

  describe('errors', function describeIndexTests() {
    before(async function () {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/logstash_functional');
      await kibanaServer.importExport.load(
        'test/functional/fixtures/kbn_archiver/invalid_scripted_field'
      );
      await PageObjects.timePicker.setDefaultAbsoluteRangeViaUiSettings();
      await PageObjects.common.navigateToApp('discover');
    });

    after(async function () {
      await kibanaServer.savedObjects.clean({ types: ['search', 'index-pattern'] });
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
