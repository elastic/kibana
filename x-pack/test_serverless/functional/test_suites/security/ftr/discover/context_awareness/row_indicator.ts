/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { encode } from '@kbn/rison';
import { FtrProviderContext } from '../../../../../ftr_provider_context';
import { SECURITY_ES_ARCHIVES_DIR, SECURITY_SOLUTION_DATA_VIEW } from '../../../constants';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'timePicker', 'discover', 'svlCommonPage']);
  const esArchiver = getService('esArchiver');
  const queryBar = getService('queryBar');
  const securitySolutionApi = getService('securitySolutionApi');
  const find = getService('find');

  describe('security document profile', () => {
    before(async () => {
      await PageObjects.svlCommonPage.loginAsViewer();
      await esArchiver.loadIfNeeded(path.join(SECURITY_ES_ARCHIVES_DIR, 'auditbeat_single'));
    });

    after(async () => {
      await esArchiver.unload(path.join(SECURITY_ES_ARCHIVES_DIR, 'auditbeat_single'));
    });
    describe('doc viewer', () => {
      describe('alerts and events', () => {
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
          it('should have row indicator for both event and alert', async () => {
            await PageObjects.common.navigateToActualUrl('discover', undefined, {
              ensureCurrentUrl: false,
            });

            await queryBar.clickQuerySubmitButton();
            await PageObjects.discover.waitUntilSearchingHasFinished();

            expect(
              await find.existsByCssSelector(
                '[data-test-subj="unifiedDataTableRowColorIndicatorCell"][title="alert"]'
              )
            ).to.eql(true);
            expect(
              await find.existsByCssSelector(
                '[data-test-subj="unifiedDataTableRowColorIndicatorCell"][title="event"]'
              )
            ).to.eql(true);
          });

          describe('ES|QL mode', () => {
            it('should have row indicator for both event and alert', async () => {
              const query = `FROM ${SECURITY_SOLUTION_DATA_VIEW}`;

              const state = encode({
                datasource: { type: 'esql' },
                query: { esql: query },
              });

              await PageObjects.common.navigateToActualUrl('discover', `?_a=${state}`, {
                ensureCurrentUrl: false,
              });

              await PageObjects.discover.waitUntilSearchingHasFinished();

              expect(
                await find.existsByCssSelector(
                  '[data-test-subj="unifiedDataTableRowColorIndicatorCell"][title="alert"]'
                )
              ).to.eql(true);
              expect(
                await find.existsByCssSelector(
                  '[data-test-subj="unifiedDataTableRowColorIndicatorCell"][title="event"]'
                )
              ).to.eql(true);
            });
          });
        });
      });
    });
  });
}
