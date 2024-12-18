/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';
import { encode } from '@kbn/rison';
import { FtrProviderContext } from '../../../../../ftr_provider_context';
import { SECURITY_ES_ARCHIVES_DIR } from '../../../constants';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'timePicker', 'discover', 'svlCommonPage']);
  const testSubjects = getService('testSubjects');
  const dataViews = getService('dataViews');
  const esArchiver = getService('esArchiver');
  const queryBar = getService('queryBar');
  const esClient = getService('es');

  describe('security root profile', () => {
    before(async () => {
      await PageObjects.svlCommonPage.loginAsViewer();
    });

    describe('doc viewer', () => {
      describe('events', () => {
        before(async () => {
          await esArchiver.loadIfNeeded(path.join(SECURITY_ES_ARCHIVES_DIR, 'auditbeat_single'));
        });

        after(async () => {
          await esArchiver.unload(path.join(SECURITY_ES_ARCHIVES_DIR, 'auditbeat_single'));
        });

        describe('DataView mode', () => {
          it('should open event overview tab', async () => {
            await PageObjects.common.navigateToActualUrl('discover', undefined, {
              ensureCurrentUrl: false,
            });
            await dataViews.createFromSearchBar({
              name: 'auditbeat-2022',
              adHoc: true,
              hasTimeField: true,
            });
            await queryBar.setQuery('host.name: "siem-kibana"');
            await queryBar.clickQuerySubmitButton();
            await PageObjects.discover.waitUntilSearchingHasFinished();
            const expandDocViewerButton = await testSubjects.find('docTableExpandToggleColumn');
            await expandDocViewerButton.click();

            await testSubjects.existOrFail('eventOverview', { timeout: 2500 });
          });
        });

        describe('ES|QL mode', () => {
          it('should open event overview tab', async () => {
            const state = encode({
              datasource: { type: 'esql' },
              query: { esql: 'from auditbeat-2022 | where host.name == "siem-kibana"' },
            });

            await PageObjects.common.navigateToActualUrl('discover', `?_a=${state}`, {
              ensureCurrentUrl: false,
            });
            await PageObjects.discover.waitUntilSearchingHasFinished();
            const expanddocviewerbutton = await testSubjects.find('doctableexpandtogglecolumn');
            await expanddocviewerbutton.click();

            await testSubjects.existOrFail('eventoverview', { timeout: 2500 });
          });
        });
      });

      describe('alerts', () => {
        before(async () => {
          await PageObjects.svlCommonPage.loginAsAdmin();
          // // sleep
          // try {
          //   const alias = await esClient.indices.get({
          //     index: '.alerts-security.alerts-default',
          //   });
          //
          // try {
          //   const stream = await esClient.indices.getDataStream({
          //     name: '.alerts-security.alerts-default',
          //   });
          // } catch (err) {}
          //
          // await esClient.indices.deleteDataStream({
          //   name: '.alerts-security.alerts-default',
          // });

          //   .deleteAlias({
          //   name: '.alerts-security.alerts-default',
          //   index: '.alerts-security.alerts-default-000001',
          // });
          await esArchiver.load(path.join(SECURITY_ES_ARCHIVES_DIR, 'ransomware_detection'), {
            useCreate: true,
          });
        });

        after(async () => {
          await esArchiver.unload(path.join(SECURITY_ES_ARCHIVES_DIR, 'query_alert'));
        });

        describe('DataView mode', () => {
          it('should open alert overview tab', async () => {
            await PageObjects.common.navigateToActualUrl('discover', undefined, {
              ensureCurrentUrl: false,
            });
            await dataViews.createFromSearchBar({
              name: '.alerts-*',
              adHoc: true,
              hasTimeField: true,
            });
            await queryBar.clickQuerySubmitButton();
            await PageObjects.discover.waitUntilSearchingHasFinished();
            const expandDocViewerButton = await testSubjects.find('docTableExpandToggleColumn');
            await expandDocViewerButton.click();

            await testSubjects.existOrFail('alertOverview', { timeout: 2500 });
          });

          describe('ES|QL mode', () => {
            it('should open alert overview tab', async () => {
              const state = encode({
                datasource: { type: 'esql' },
                query: { esql: 'from .alert-*' },
              });

              await PageObjects.common.navigateToActualUrl('discover', `?_a=${state}`, {
                ensureCurrentUrl: false,
              });
              await PageObjects.discover.waitUntilSearchingHasFinished();
              const expandDocViewerButton = await testSubjects.find('doctableexpandtogglecolumn');
              await expandDocViewerButton.click();

              await testSubjects.existOrFail('alertOverview', { timeout: 2500 });
            });
          });
        });
      });
    });
  });
}
