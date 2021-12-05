/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../ftr_provider_context';

export default ({ getService, getPageObject }: FtrProviderContext) => {
  describe('Observability alert experimental disclaimer', function () {
    this.tags('includeFirefox');

    const observability = getService('observability');
    const esArchiver = getService('esArchiver');
    const testSubjects = getService('testSubjects');

    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/observability/alerts');
      await esArchiver.load('x-pack/test/functional/es_archives/infra/metrics_and_logs');

      await observability.alerts.common.navigateWithoutFilter();
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/infra/metrics_and_logs');
      await esArchiver.unload('x-pack/test/functional/es_archives/observability/alerts');
    });

    it('Shows experimental disclaimer', async () => {
      await observability.alerts.common.getExperimentalDisclaimer();
    });

    it('Dismiss experimental disclaimer', async () => {
      await testSubjects.click('o11yExperimentalDisclaimerDismissBtn');
      const o11yExperimentalDisclaimer = await testSubjects.exists('o11yExperimentalDisclaimer');
      expect(o11yExperimentalDisclaimer).not.to.be(null);
    });
  });
};
