/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { AttachmentType } from '@kbn/cases-plugin/common/types/domain';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const browser = getService('browser');
  const esArchiver = getService('esArchiver');
  const cases = getService('cases');
  const observability = getService('observability');
  const find = getService('find');
  const PageObjects = getPageObjects(['common', 'header']);
  const retry = getService('retry');

  describe('Observability cases', () => {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/observability/alerts');
      await esArchiver.load('x-pack/test/functional/es_archives/infra/metrics_and_logs');
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/infra/metrics_and_logs');
      await esArchiver.unload('x-pack/test/functional/es_archives/observability/alerts');
    });

    describe('Case detail rule link', () => {
      before(async () => {
        await observability.users.setTestUserRole(
          observability.users.defineBasicObservabilityRole({
            observabilityCasesV3: ['all'],
            logs: ['all'],
          })
        );

        const owner = 'observability';
        await retry.try(async () => {
          const caseData = await cases.api.createCase({
            title: 'Sample case',
            owner,
          });
          await cases.api.createAttachment({
            caseId: caseData.id,
            params: {
              alertId: ['alert-id'],
              index: ['.internal.alerts-observability.alerts-default-000001'],
              rule: { id: 'rule-id', name: 'My rule name' },
              type: AttachmentType.alert,
              owner,
            },
          });
        });
      });

      after(async () => {
        await retry.try(async () => {
          await cases.api.deleteAllCases();
          await observability.users.restoreDefaultTestUserRole();
        });
      });

      it('should link to observability rule pages in case details', async () => {
        await cases.navigation.navigateToApp('observabilityCases', 'cases-all-title');
        await cases.casesTable.waitForCasesToBeListed();
        await cases.casesTable.goToFirstListedCase();
        await PageObjects.header.waitUntilLoadingHasFinished();

        await (await find.byCssSelector('[data-test-subj*="alert-rule-link"]')).click();

        const url = await browser.getCurrentUrl();
        expect(url.includes('/app/observability/alerts/rules')).to.be(true);
      });
    });
  });
};
