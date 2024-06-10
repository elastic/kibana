/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { log, timerange } from '@kbn/apm-synthtrace-client';
import expect from '@kbn/expect';
import moment from 'moment';
import { FtrProviderContext } from '../../../ftr_provider_context';

const MORE_THAN_1024_CHARS =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const retry = getService('retry');
  const PageObjects = getPageObjects(['discover', 'observabilityLogsExplorer', 'svlCommonPage']);
  const synthtrace = getService('svlLogsSynthtraceClient');
  const dataGrid = getService('dataGrid');
  const from = '2024-02-06T10:24:14.035Z';
  const to = '2024-02-06T10:25:14.091Z';
  const TEST_TIMEOUT = 10 * 1000; // 10 secs

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

  describe('When the logs explorer loads', () => {
    before(async () => {
      await synthtrace.index(generateLogsData({ to }));
      await PageObjects.svlCommonPage.loginWithRole('viewer');
      await navigateToLogsExplorer();
    });

    after(async () => {
      await synthtrace.clean();
      await PageObjects.svlCommonPage.forceLogout();
    });

    describe('should render custom control columns properly', async () => {
      it('should render control column with proper header', async () => {
        await retry.tryForTime(TEST_TIMEOUT, async () => {
          // First control column has no title, so empty string, leading control column has title
          expect(await dataGrid.getControlColumnHeaderFields()).to.eql(['', 'actions']);
        });
      });

      it('should render the expand icon in the leading control column', async () => {
        await retry.tryForTime(TEST_TIMEOUT, async () => {
          const cellElement = await dataGrid.getCellElement(0, 1);
          const expandButton = await cellElement.findByTestSubject('docTableExpandToggleColumn');
          expect(expandButton).to.not.be.empty();
        });
      });

      it('should render the malformed icon in the leading control column if malformed doc exists', async () => {
        await retry.tryForTime(TEST_TIMEOUT, async () => {
          const cellElement = await dataGrid.getCellElement(1, 1);
          const malformedButton = await cellElement.findByTestSubject('docTableDegradedDocExist');
          expect(malformedButton).to.not.be.empty();
        });
      });

      it('should render the disabled malformed icon in the leading control column when malformed doc does not exists', async () => {
        await retry.tryForTime(TEST_TIMEOUT, async () => {
          const cellElement = await dataGrid.getCellElement(0, 1);
          const malformedDisableButton = await cellElement.findByTestSubject(
            'docTableDegradedDocDoesNotExist'
          );
          expect(malformedDisableButton).to.not.be.empty();
        });
      });

      it('should render the stacktrace icon in the leading control column when stacktrace exists', async () => {
        await retry.tryForTime(TEST_TIMEOUT, async () => {
          const cellElement = await dataGrid.getCellElement(4, 1);
          const stacktraceButton = await cellElement.findByTestSubject('docTableStacktraceExist');
          expect(stacktraceButton).to.not.be.empty();
        });
      });

      it('should render the stacktrace icon disabled in the leading control column when stacktrace does not exists', async () => {
        await retry.tryForTime(TEST_TIMEOUT, async () => {
          const cellElement = await dataGrid.getCellElement(1, 1);
          const stacktraceButton = await cellElement.findByTestSubject(
            'docTableStacktraceDoesNotExist'
          );
          expect(stacktraceButton).to.not.be.empty();
        });
      });
    });
  });
}

function generateLogsData({ to, count = 1 }: { to: string; count?: number }) {
  const logs = timerange(moment(to).subtract(1, 'second'), moment(to))
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

  const malformedDocs = timerange(
    moment(to).subtract(2, 'second'),
    moment(to).subtract(1, 'second')
  )
    .interval('1m')
    .rate(1)
    .generator((timestamp) =>
      Array(count)
        .fill(0)
        .map(() => {
          return log
            .create()
            .message('A malformed doc')
            .logLevel(MORE_THAN_1024_CHARS)
            .timestamp(timestamp)
            .defaults({ 'service.name': 'synth-service' });
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
          return log.create().logLevel('info').timestamp(timestamp).defaults({
            'error.stack_trace': 'Error message in error.stack_trace',
            'service.name': 'node-service',
          });
        })
    );

  const logsWithErrorException = timerange(
    moment(to).subtract(4, 'second'),
    moment(to).subtract(3, 'second')
  )
    .interval('1m')
    .rate(1)
    .generator((timestamp) =>
      Array(count)
        .fill(0)
        .map(() => {
          return log.create().logLevel('info').timestamp(timestamp).defaults({
            'error.exception.stacktrace': 'Error message in error.exception.stacktrace',
            'service.name': 'node-service',
          });
        })
    );

  const logsWithErrorInLog = timerange(
    moment(to).subtract(5, 'second'),
    moment(to).subtract(4, 'second')
  )
    .interval('1m')
    .rate(1)
    .generator((timestamp) =>
      Array(count)
        .fill(0)
        .map(() => {
          return log.create().logLevel('info').timestamp(timestamp).defaults({
            'error.log.stacktrace': 'Error message in error.log.stacktrace',
            'service.name': 'node-service',
          });
        })
    );

  return [logs, malformedDocs, logsWithErrorMessage, logsWithErrorException, logsWithErrorInLog];
}
