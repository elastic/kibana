/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import moment, { Moment } from 'moment/moment';
import { log, timerange } from '@kbn/apm-synthtrace-client';
import { FtrProviderContext } from './config';

const defaultLogColumns = ['@timestamp', 'content', 'service.name', 'host.name'];

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const retry = getService('retry');
  const PageObjects = getPageObjects(['discover', 'observabilityLogExplorer']);
  const synthtrace = getService('logSynthtraceEsClient');
  const dataGrid = getService('dataGrid');
  const testSubjects = getService('testSubjects');
  const from = moment('2023-12-27T10:24:14.035Z');
  const to = moment('2023-12-27T10:25:14.091Z');
  const TEST_TIMEOUT = 10 * 1000; // 10 secs

  const navigateToLogExplorer = () =>
    PageObjects.observabilityLogExplorer.navigateTo({
      pageState: {
        time: {
          from,
          to,
          mode: 'absolute',
        },
      },
    });

  describe('When the log explorer loads', () => {
    before(async () => {
      await synthtrace.index(generateLogsData({ from, to }));
      await navigateToLogExplorer();
    });

    after(async () => {
      await synthtrace.clean();
    });

    describe('columns selection initialization and update', () => {
      it("should initialize the table columns to logs' default selection", async () => {
        await retry.tryForTime(TEST_TIMEOUT, async () => {
          expect(await PageObjects.discover.getColumnHeaders()).to.eql(defaultLogColumns);
        });
      });

      it('should restore the table columns from the URL state if exists', async () => {
        await PageObjects.observabilityLogExplorer.navigateTo({
          pageState: {
            time: {
              from,
              to,
              mode: 'absolute',
            },
            columns: [
              { field: 'content' },
              { field: 'service.name' },
              { field: 'host.name' },
              { field: 'data_stream.namespace' },
            ],
          },
        });

        await retry.tryForTime(TEST_TIMEOUT, async () => {
          expect(await PageObjects.discover.getColumnHeaders()).to.eql([
            ...defaultLogColumns,
            'data_stream.namespace',
          ]);
        });
      });
    });

    describe('render content virtual column properly', async () => {
      it('should render log level and log message when present', async () => {
        await retry.tryForTime(TEST_TIMEOUT, async () => {
          const cellElement = await dataGrid.getCellElement(0, 3);
          const cellValue = await cellElement.getVisibleText();
          expect(cellValue.includes('info')).to.be(true);
          expect(cellValue.includes('message')).to.be(true);
          expect(cellValue.includes('A sample log')).to.be(true);
        });
      });

      it('should render log message when present and skip log level when missing', async () => {
        await retry.tryForTime(TEST_TIMEOUT, async () => {
          const cellElement = await dataGrid.getCellElement(1, 3);
          const cellValue = await cellElement.getVisibleText();
          expect(cellValue.includes('info')).to.be(false);
          expect(cellValue.includes('message')).to.be(true);
          expect(cellValue.includes('A sample log')).to.be(true);
        });
      });

      it('should render message from error object when top level message not present', async () => {
        await retry.tryForTime(TEST_TIMEOUT, async () => {
          const cellElement = await dataGrid.getCellElement(2, 3);
          const cellValue = await cellElement.getVisibleText();
          expect(cellValue.includes('info')).to.be(true);
          expect(cellValue.includes('error.message')).to.be(true);
          expect(cellValue.includes('message in error object')).to.be(true);
        });
      });

      it('should render message from event.original when top level message and error.message not present', async () => {
        await retry.tryForTime(TEST_TIMEOUT, async () => {
          const cellElement = await dataGrid.getCellElement(3, 3);
          const cellValue = await cellElement.getVisibleText();
          expect(cellValue.includes('info')).to.be(true);
          expect(cellValue.includes('event.original')).to.be(true);
          expect(cellValue.includes('message in event original')).to.be(true);
        });
      });

      it('should render the whole JSON when neither message, error.message and event.original are present', async () => {
        await retry.tryForTime(TEST_TIMEOUT, async () => {
          const cellElement = await dataGrid.getCellElement(4, 3);
          const cellValue = await cellElement.getVisibleText();
          expect(cellValue.includes('info')).to.be(true);

          expect(cellValue.includes('message')).to.be(false);
          expect(cellValue.includes('error.message')).to.be(false);
          expect(cellValue.includes('event.original')).to.be(false);

          const cellAttribute = await cellElement.findByTestSubject(
            'logExplorerCellDescriptionList'
          );
          expect(cellAttribute).not.to.be.empty();
        });
      });

      it('on cell expansion with no message field should open JSON Viewer', async () => {
        await retry.tryForTime(TEST_TIMEOUT, async () => {
          await dataGrid.clickCellExpandButton(4, 3);
          await testSubjects.existOrFail('dataTableExpandCellActionJsonPopover');
        });
      });

      it('on cell expansion with message field should open regular popover', async () => {
        await navigateToLogExplorer();
        await retry.tryForTime(TEST_TIMEOUT, async () => {
          await dataGrid.clickCellExpandButton(3, 3);
          await testSubjects.existOrFail('euiDataGridExpansionPopover');
        });
      });
    });
  });
}

function generateLogsData({ from, to, count = 1 }: { from: Moment; to: Moment; count: number }) {
  const logs = timerange(moment(to).subtract(1, 'second'), to)
    .interval('1m')
    .rate(1)
    .generator((timestamp) =>
      Array(count)
        .fill(0)
        .map(() => {
          return log.create().message('A sample log').logLevel('info').timestamp(timestamp);
        })
    );

  const logsWithNoLogLevel = timerange(
    moment(to).subtract(2, 'second'),
    moment(to).subtract(1, 'second')
  )
    .interval('1m')
    .rate(1)
    .generator((timestamp) =>
      Array(count)
        .fill(0)
        .map(() => {
          return log.create().message('A sample log').timestamp(timestamp);
        })
    );

  const logsWithErrorMessage = timerange(
    moment(to).subtract(3, 'second'),
    moment(to).subtract(2, 'second')
  )
    .interval('1m')
    .rate(1)
    .generator((timestamp) =>
      Array(count)
        .fill(0)
        .map(() => {
          return log
            .create()
            .logLevel('info')
            .timestamp(timestamp)
            .defaults({ 'error.message': 'message in error object' });
        })
    );

  const logsWithEventOriginal = timerange(
    moment(to).subtract(4, 'second'),
    moment(to).subtract(3, 'second')
  )
    .interval('1m')
    .rate(1)
    .generator((timestamp) =>
      Array(count)
        .fill(0)
        .map(() => {
          return log
            .create()
            .logLevel('info')
            .timestamp(timestamp)
            .defaults({ 'event.original': 'message in event original' });
        })
    );

  const logsWithNoMessage = timerange(
    moment(to).subtract(5, 'second'),
    moment(to).subtract(4, 'second')
  )
    .interval('1m')
    .rate(1)
    .generator((timestamp) =>
      Array(count)
        .fill(0)
        .map(() => {
          return log.create().logLevel('info').timestamp(timestamp);
        })
    );

  const logWithNoMessageNoLogLevel = timerange(
    moment(to).subtract(6, 'second'),
    moment(to).subtract(5, 'second')
  )
    .interval('1m')
    .rate(1)
    .generator((timestamp) =>
      Array(count)
        .fill(0)
        .map(() => {
          return log.create().timestamp(timestamp);
        })
    );

  return [
    logs,
    logsWithNoLogLevel,
    logsWithErrorMessage,
    logsWithEventOriginal,
    logsWithNoMessage,
    logWithNoMessageNoLogLevel,
  ];
}
