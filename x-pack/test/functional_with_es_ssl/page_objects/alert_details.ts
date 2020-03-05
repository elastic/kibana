/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

export function AlertDetailsPageProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const log = getService('log');
  const retry = getService('retry');

  return {
    async getHeadingText() {
      return await testSubjects.getVisibleText('alertDetailsTitle');
    },
    async getAlertType() {
      return await testSubjects.getVisibleText('alertTypeLabel');
    },
    async getActionsLabels() {
      return {
        actionType: await testSubjects.getVisibleText('actionTypeLabel'),
        actionCount: await testSubjects.getVisibleText('actionCountLabel'),
      };
    },
    async getAlertInstancesList() {
      const table = await find.byCssSelector(
        '.euiBasicTable[data-test-subj="alertInstancesList"]:not(.euiBasicTable-loading)'
      );
      const $ = await table.parseDomContent();
      return $.findTestSubjects('alert-instance-row')
        .toArray()
        .map(row => {
          return {
            instance: $(row)
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
    async clickAlertInstanceMuteButton(instance: string) {
      const muteAlertInstanceButton = await testSubjects.find(
        `muteAlertInstanceButton_${instance}`
      );
      await muteAlertInstanceButton.click();
    },
    async ensureAlertInstanceMute(instance: string, isMuted: boolean) {
      await retry.try(async () => {
        const muteAlertInstanceButton = await testSubjects.find(
          `muteAlertInstanceButton_${instance}`
        );
        log.debug(`checked:${await muteAlertInstanceButton.getAttribute('checked')}`);
        expect(await muteAlertInstanceButton.getAttribute('checked')).to.eql(
          isMuted ? 'true' : null
        );

        expect(await testSubjects.exists(`mutedAlertInstanceLabel_${instance}`)).to.eql(isMuted);
      });
    },
    async ensureAlertInstanceExistance(instance: string, shouldExist: boolean) {
      await retry.try(async () => {
        const table = await find.byCssSelector(
          '.euiBasicTable[data-test-subj="alertInstancesList"]:not(.euiBasicTable-loading)'
        );
        const $ = await table.parseDomContent();
        expect(
          $.findTestSubjects('alert-instance-row')
            .toArray()
            .filter(
              row =>
                $(row)
                  .findTestSubject('alertInstancesTableCell-instance')
                  .find('.euiTableCellContent')
                  .text() === instance
            )
        ).to.eql(shouldExist ? 1 : 0);
      });
    },
    async clickPaginationNextPage() {
      const nextButton = await testSubjects.find(`pagination-button-next`);
      nextButton.click();
    },
  };
}
