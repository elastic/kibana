/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import kbnRison from '@kbn/rison';
import type { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { common, svlCommonPage } = getPageObjects([
    'common',
    'timePicker',
    'discover',
    'header',
    'timePicker',
    'svlCommonPage',
  ]);
  const browser = getService('browser');
  const esArchiver = getService('esArchiver');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');

  describe('extension getAppMenu', () => {
    before(async () => {
      await svlCommonPage.loginAsAdmin();
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
    });

    after(async () => {
      await esArchiver.unload('test/functional/fixtures/es_archiver/logstash_functional');
    });

    beforeEach(async () => {
      const state = kbnRison.encode({
        dataSource: { type: 'esql' },
        query: { esql: 'from logstash* | sort @timestamp desc' },
      });
      await common.navigateToActualUrl('discover', `?_a=${state}`, {
        ensureCurrentUrl: false,
      });
    });

    it('should display a "Add data" link to navigate to the onboading page', async () => {
      const link = await testSubjects.find('discoverAppMenuDatasetQualityLink');
      await link.click();

      await retry.try(async () => {
        const url = await browser.getCurrentUrl();
        expect(url).to.contain(`/app/management/data/data_quality`);
      });
    });

    it('should display a "Create custom threshold rule" action under the Alerts menu to create an o11y alert', async () => {
      const alertsButton = await testSubjects.find('discoverAlertsButton');
      await alertsButton.click();

      const createRuleButton = await testSubjects.find('discoverAppMenuCustomThresholdRule');
      await createRuleButton.click();

      const ruleTitleElement = await testSubjects.find('selectedRuleTypeTitle');

      await retry.try(async () => {
        expect(await ruleTitleElement.getVisibleText()).to.equal('Custom threshold');
      });
    });

    it('should display a "Create SLO" action under the Alerts menu to create an o11y alert', async () => {
      const alertsButton = await testSubjects.find('discoverAlertsButton');
      await alertsButton.click();

      const createSLOButton = await testSubjects.find('discoverAppMenuCreateSlo');
      await createSLOButton.click();

      const sloTitleElement = await testSubjects.find('addSLOFlyoutTitle');
      expect(await sloTitleElement.getVisibleText()).to.equal('Create SLO');
    });
  });
}
