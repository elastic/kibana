/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { URL } from 'url';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { DATES } from '../constants';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const retry = getService('retry');
  const browser = getService('browser');
  const esArchiver = getService('esArchiver');
  const logsUi = getService('logsUi');
  const find = getService('find');
  const logFilter = {
    timeRange: {
      from: DATES.metricsAndLogs.stream.startWithData,
      to: DATES.metricsAndLogs.stream.endWithData,
    },
  };

  describe('Log stream supports nano precision', function () {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/infra/logs_with_nano_date');
    });
    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/infra/logs_with_nano_date');
    });

    it('should display logs entries containing date_nano timestamps properly ', async () => {
      await logsUi.logStreamPage.navigateTo({ logFilter });

      const logStreamEntries = await logsUi.logStreamPage.getStreamEntries();

      expect(logStreamEntries.length).to.be(4);
    });

    it('should render timestamp column properly', async () => {
      await logsUi.logStreamPage.navigateTo({ logFilter });

      await retry.try(async () => {
        const columnHeaderLabels = await logsUi.logStreamPage.getColumnHeaderLabels();
        expect(columnHeaderLabels[0]).to.eql('Oct 17, 2018');
      });
    });

    it('should render timestamp column values properly', async () => {
      await logsUi.logStreamPage.navigateTo({ logFilter });

      const logStreamEntries = await logsUi.logStreamPage.getStreamEntries();

      const firstLogStreamEntry = logStreamEntries[0];

      const entryTimestamp = await logsUi.logStreamPage.getLogEntryColumnValueByName(
        firstLogStreamEntry,
        'timestampLogColumn'
      );

      expect(entryTimestamp).to.be('19:43:22.111');
    });

    it('should properly sync logPosition in url', async () => {
      const currentUrl = await browser.getCurrentUrl();
      const parsedUrl = new URL(currentUrl);

      expect(parsedUrl.searchParams.get('logPosition')).to.contain(
        `time:\'2018-10-17T19:46:22.333333333Z\'`
      );
    });

    it('should properly render timestamp in flyout with nano precision', async () => {
      await logsUi.logStreamPage.navigateTo({ logFilter });

      const logStreamEntries = await logsUi.logStreamPage.getStreamEntries();
      const firstLogStreamEntry = logStreamEntries[0];

      await logsUi.logStreamPage.openLogEntryDetailsFlyout(firstLogStreamEntry);

      const cells = await find.allByCssSelector('.euiTableCellContent');

      let isFound = false;

      for (const cell of cells) {
        const cellText = await cell.getVisibleText();
        if (cellText === '2018-10-17T19:43:22.111111111Z') {
          isFound = true;
          return;
        }
      }

      expect(isFound).to.be(true);
    });
  });
};
