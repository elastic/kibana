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
  const queryBar = getService('queryBar');

  describe('cell renderer', () => {
    before(async () => {
      await PageObjects.svlCommonPage.loginAsAdmin();
    });

    describe('DataView mode', () => {
      describe('cell renderer', () => {
        it('should open host.name flyout with correct content', async () => {
          await PageObjects.common.navigateToActualUrl('discover', undefined, {
            ensureCurrentUrl: false,
          });
          await queryBar.setQuery('host.name: "siem-kibana" AND event.kind: "signal"');
          await queryBar.clickQuerySubmitButton();
          await PageObjects.discover.waitUntilSearchingHasFinished();
          const hostName = await testSubjects.findAll('host-details-button', 2500);
          expect(hostName).to.have.length(1);
          await hostName[0].click();
          await testSubjects.existOrFail('host-panel-header', { timeout: 2500 });
          await testSubjects.existOrFail('asset-criticality-selector', { timeout: 2500 });
          await testSubjects.existOrFail('observedEntity-accordion', { timeout: 2500 });
        });
      });

      describe('ES|QL mode', () => {
        it('should open host.name flyout', async () => {
          const state = kbnRison.encode({
            dataSource: { type: 'esql' },
            query: {
              esql: 'from auditbeat-2022 | WHERE host.name == "siem-kibana" and event.kind != "signal"',
            },
          });
          await PageObjects.common.navigateToActualUrl('discover', `?_a=${state}`, {
            ensureCurrentUrl: false,
          });
          await PageObjects.discover.waitUntilSearchingHasFinished();
          await PageObjects.discover.dragFieldToTable('host.name');
          const hostName = await testSubjects.findAll('host-details-button', 2500);
          expect(hostName).to.have.length(1);
          await hostName[0].click();
          await testSubjects.existOrFail('host-panel-header', { timeout: 2500 });
          await testSubjects.existOrFail('asset-criticality-selector', { timeout: 2500 });
          await testSubjects.existOrFail('observedEntity-accordion', { timeout: 2500 });
        });
      });
    });
  });
}
