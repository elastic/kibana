/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

export function RuleDetailsPageProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const log = getService('log');
  const retry = getService('retry');

  return {
    async getHeadingText() {
      return await testSubjects.getVisibleText('alertDetailsTitle');
    },
    async getRuleType() {
      return await testSubjects.getVisibleText('alertTypeLabel');
    },
    async getActionsLabels() {
      return {
        connectorType: await testSubjects.getVisibleText('actionTypeLabel'),
      };
    },
    async getAlertsList() {
      const table = await find.byCssSelector(
        '.euiBasicTable[data-test-subj="alertInstancesList"]:not(.euiBasicTable-loading)'
      );
      const $ = await table.parseDomContent();
      return $.findTestSubjects('alert-instance-row')
        .toArray()
        .map((row) => {
          return {
            alert: $(row)
              .findTestSubject('alertInstancesTableCell-instance')
              .find('.euiTableCellContent')
              .text(),
            status: $(row)
              .findTestSubject('alertInstancesTableCell-status')
              .find('.euiTableCellContent')
              .text(),
            start: $(row)
              .findTestSubject('alertInstancesTableCell-start')
              .find('.euiTableCellContent')
              .text(),
            duration: $(row)
              .findTestSubject('alertInstancesTableCell-duration')
              .find('.euiTableCellContent')
              .text(),
          };
        });
    },
    async getAlertDurationEpoch(): Promise<number> {
      const alertDurationEpoch = await find.byCssSelector(
        'input[data-test-subj="alertInstancesDurationEpoch"]'
      );
      return parseInt(await alertDurationEpoch.getAttribute('value'), 10);
    },
    async clickAlertMuteButton(alert: string) {
      const muteAlertButton = await testSubjects.find(`muteAlertButton_${alert}`);
      await muteAlertButton.click();
    },
    async ensureAlertMuteState(alert: string, isMuted: boolean) {
      await retry.try(async () => {
        const muteAlertButton = await testSubjects.find(`muteAlertButton_${alert}`);
        log.debug(`checked:${await muteAlertButton.getAttribute('aria-checked')}`);
        expect(await muteAlertButton.getAttribute('aria-checked')).to.eql(
          isMuted ? 'true' : 'false'
        );
      });
    },
    async ensureAlertExistence(alert: string, shouldExist: boolean) {
      await retry.try(async () => {
        const table = await find.byCssSelector(
          '.euiBasicTable[data-test-subj="alertInstancesList"]:not(.euiBasicTable-loading)'
        );
        const $ = await table.parseDomContent();
        expect(
          $.findTestSubjects('alert-instance-row')
            .toArray()
            .filter(
              (row) =>
                $(row)
                  .findTestSubject('alertInstancesTableCell-instance')
                  .find('.euiTableCellContent')
                  .text() === alert
            )
        ).to.eql(shouldExist ? 1 : 0);
      });
    },
    async clickPaginationNextPage() {
      const nextButton = await testSubjects.find(`pagination-button-next`);
      nextButton.click();
    },
    async isViewInAppDisabled() {
      await retry.try(async () => {
        const viewInAppButton = await testSubjects.find(`alertDetails-viewInApp`);
        expect(await viewInAppButton.getAttribute('disabled')).to.eql('true');
      });
      return true;
    },
    async isViewInAppEnabled() {
      await retry.try(async () => {
        const viewInAppButton = await testSubjects.find(`alertDetails-viewInApp`);
        expect(await viewInAppButton.getAttribute('disabled')).to.not.eql('true');
      });
      return true;
    },
    async clickViewInApp() {
      return await testSubjects.click('alertDetails-viewInApp');
    },
    async getNoOpAppTitle() {
      await retry.try(async () => {
        const title = await testSubjects.find('noop-title');
        expect(title.isDisplayed()).to.eql(true);
      });
      return await testSubjects.getVisibleText('noop-title');
    },
  };
}
