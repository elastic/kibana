/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { encode } from '@kbn/rison';
import { FtrProviderContext } from '../../../../../ftr_provider_context';
import { SECURITY_ES_ARCHIVES_DIR, SECURITY_SOLUTION_DATA_VIEW } from '../../../constants';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'timePicker', 'discover', 'svlCommonPage']);
  const testSubjects = getService('testSubjects');
  const dataViews = getService('dataViews');
  const esArchiver = getService('esArchiver');
  const queryBar = getService('queryBar');
  const securitySolutionApi = getService('securitySolutionApi');

  describe('security root profile', () => {
    before(async () => {
      await PageObjects.svlCommonPage.loginAsViewer();
      await esArchiver.loadIfNeeded(path.join(SECURITY_ES_ARCHIVES_DIR, 'auditbeat_single'));
    });

    after(async () => {
      await esArchiver.unload(path.join(SECURITY_ES_ARCHIVES_DIR, 'auditbeat_single'));
    });
    describe('doc viewer', () => {
      describe('events', () => {
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
            const expanddocviewerbutton = await testSubjects.find('docTableExpandToggleColumn');
            await expanddocviewerbutton.click();

            await testSubjects.existOrFail('eventOverview', { timeout: 2500 });
          });
        });
      });

      describe('alerts', () => {
        before(async () => {
          const testRunUuid = uuidv4();
          const ruleName = `Test Rule - ${testRunUuid}`;

          await securitySolutionApi.createRule({
            body: {
              name: ruleName,
              description: 'test rule',
              type: 'query',
              enabled: true,
              query: '_id: *',
              index: ['auditbeat-*'],
              from: 'now-10y',
              interval: '1m',
              severity: 'high',
              risk_score: 70,
            },
          });
          await PageObjects.svlCommonPage.loginAsAdmin();
        });

        describe('DataView mode', () => {
          it('should open alert overview tab', async () => {
            await PageObjects.common.navigateToActualUrl('discover', undefined, {
              ensureCurrentUrl: false,
            });

            await queryBar.setQuery('event.kind: "signal"');
            await queryBar.clickQuerySubmitButton();
            await PageObjects.discover.waitUntilSearchingHasFinished();
            const expandDocViewerButton = await testSubjects.find('docTableExpandToggleColumn');
            await expandDocViewerButton.click();

            await testSubjects.existOrFail('alertOverview', { timeout: 2500 });
          });

          describe('ES|QL mode', () => {
            it('should open alert overview tab', async () => {
              const query = `FROM ${SECURITY_SOLUTION_DATA_VIEW} | WHERE event.kind == "signal"`;

              const state = encode({
                datasource: { type: 'esql' },
                query: { esql: query },
              });

              await PageObjects.common.navigateToActualUrl('discover', `?_a=${state}`, {
                ensureCurrentUrl: false,
              });

              await PageObjects.discover.waitUntilSearchingHasFinished();
              const expandDocViewerButton = await testSubjects.find('docTableExpandToggleColumn');
              await expandDocViewerButton.click();

              await testSubjects.existOrFail('alertOverview', { timeout: 2500 });
            });
          });
        });
      });
    });
  });
}
