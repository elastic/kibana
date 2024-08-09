/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import moment from 'moment/moment';
import { log, timerange } from '@kbn/apm-synthtrace-client';
import { WebElementWrapper } from '@kbn/ftr-common-functional-ui-services';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const browser = getService('browser');
  const retry = getService('retry');
  const PageObjects = getPageObjects(['discover', 'observabilityLogsExplorer', 'svlCommonPage']);
  const synthtrace = getService('svlLogsSynthtraceClient');
  const kibanaServer = getService('kibanaServer');
  const from = '2023-12-27T10:24:14.035Z';
  const to = '2023-12-27T10:25:14.091Z';

  const navigateToLogsExplorer = () =>
    PageObjects.observabilityLogsExplorer.navigateTo({
      pageState: {
        time: {
          from,
          to,
          mode: 'absolute',
        },
      },
    });

  describe('Navigation', () => {
    before(async () => {
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover');
      await synthtrace.index(generateLogsData({ to }));
      await PageObjects.svlCommonPage.loginAsViewer();
      await navigateToLogsExplorer();
    });

    after(async () => {
      await kibanaServer.importExport.unload('test/functional/fixtures/kbn_archiver/discover');
      await synthtrace.clean();
    });

    it('should correctly restore the previous selection and data when navigating back from another page', async () => {
      await PageObjects.observabilityLogsExplorer.openDataSourceSelector();
      await PageObjects.observabilityLogsExplorer
        .getUncategorizedTab()
        .then((tab: WebElementWrapper) => tab.click());

      await retry.try(async () => {
        const menuEntries = await PageObjects.observabilityLogsExplorer
          .getUncategorizedContextMenu()
          .then((menu: WebElementWrapper) =>
            PageObjects.observabilityLogsExplorer.getPanelEntries(menu)
          );

        expect(await menuEntries[0].getVisibleText()).to.be('synth');
        menuEntries[0].click();
      });

      // Assert selection is loaded correctly
      const rows = await PageObjects.discover.getDocTableRows();
      expect(rows.length).to.equal(1);

      // Navigate to Discover
      const discoverLink = await PageObjects.observabilityLogsExplorer.getDiscoverFallbackLink();
      await discoverLink.click();
      await PageObjects.discover.waitForDocTableLoadingComplete();

      // Navigate back to Logs Explorer using browser navigation
      await browser.goBack();
      await PageObjects.discover.waitForDocTableLoadingComplete();

      // Assert selection data is restored correctly
      const restoredRows = await PageObjects.discover.getDocTableRows();
      expect(restoredRows.length).to.equal(1);

      // Change selection to all logs to assert its data are loaded
      await PageObjects.observabilityLogsExplorer.openDataSourceSelector();
      const allLogsButton = await PageObjects.observabilityLogsExplorer.getAllLogsButton();
      await allLogsButton.click();
      await PageObjects.discover.waitForDocTableLoadingComplete();

      // Assert new selection data is loaded correctly
      const allLogsRows = await PageObjects.discover.getDocTableRows();
      expect(allLogsRows.length).to.equal(2);
    });
  });
}

function generateLogsData({ to, count = 1 }: { to: string; count?: number }) {
  const logsSynth = timerange(moment(to).subtract(1, 'second'), moment(to))
    .interval('1m')
    .rate(1)
    .generator((timestamp) =>
      Array(count)
        .fill(0)
        .map(() => {
          return log
            .create()
            .message('A sample log')
            .logLevel('info')
            .timestamp(timestamp)
            .defaults({ 'service.name': 'synth-service' });
        })
    );

  const logsSystem = timerange(moment(to).subtract(2, 'second'), moment(to).subtract(1, 'second'))
    .interval('1m')
    .rate(1)
    .generator((timestamp) =>
      Array(count)
        .fill(0)
        .map(() => {
          return log
            .create()
            .dataset('system')
            .message('A sample log')
            .timestamp(timestamp)
            .defaults({ 'service.name': 'system-service' });
        })
    );

  return [logsSynth, logsSystem];
}
