/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import kbnRison from '@kbn/rison';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'timePicker', 'discover', 'svlCommonPage']);
  const testSubjects = getService('testSubjects');
  const dataViews = getService('dataViews');

  describe('security root profile', () => {
    before(async () => {
      await PageObjects.svlCommonPage.loginAsAdmin();
    });

    describe('cell renderers', () => {
      describe('host.name', () => {
        describe('ES|QL mode', () => {
          it('should open host.name flyout', async () => {
            const state = kbnRison.encode({
              dataSource: { type: 'esql' },
              query: { esql: 'from my-example-logs | sort @timestamp desc' },
            });

            await PageObjects.common.navigateToActualUrl('discover', `?_a=${state}`, {
              ensureCurrentUrl: false,
            });
            await PageObjects.discover.waitUntilSearchingHasFinished();
            await PageObjects.discover.dragFieldToTable('host.name');
            expect((await PageObjects.discover.getColumnHeaders()).join(', ')).to.be(
              '@timestamp, log.level, message, host.name'
            );
            // security host.name button
            const hostName = await testSubjects.findAll('host-details-button', 2500);
            expect(hostName).to.have.length(2);
            await hostName[0].click();
            await testSubjects.existOrFail('host-panel-header', { timeout: 2500 });
            await testSubjects.existOrFail('asset-criticality-selector', { timeout: 2500 });
            await testSubjects.existOrFail('observedEntity-accordion', { timeout: 2500 });
          });
        });

        describe('DataView mode', () => {
          it('should open host.name flyout', async () => {
            await PageObjects.common.navigateToActualUrl('discover', undefined, {
              ensureCurrentUrl: false,
            });
            await dataViews.switchTo('my-example-logs');
            await PageObjects.discover.waitUntilSearchingHasFinished();
            await PageObjects.discover.dragFieldToTable('host.name');
            expect((await PageObjects.discover.getColumnHeaders()).join(', ')).to.be(
              '@timestamp, log.level, message, host.name'
            );
            // security host.name button
            const hostName = await testSubjects.findAll('host-details-button', 2500);
            expect(hostName).to.have.length(2);
            await hostName[0].click();
            await testSubjects.existOrFail('host-panel-header', { timeout: 2500 });
            await testSubjects.existOrFail('asset-criticality-selector', { timeout: 2500 });
            await testSubjects.existOrFail('observedEntity-accordion', { timeout: 2500 });
          });
        });
      });
    });
  });
}
