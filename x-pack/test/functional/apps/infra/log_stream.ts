/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { URL } from 'url';
import { FtrProviderContext } from '../../ftr_provider_context';

const SERVICE_ID = '49a18510598271e924253ed2581d7ada';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const pageObjects = getPageObjects(['common']);
  const retry = getService('retry');
  const browser = getService('browser');
  const esArchiver = getService('esArchiver');

  describe('Log stream', function () {
    describe('Legacy URL handling', async () => {
      describe('Correctly handles legacy versions of logFilter', async () => {
        before(async () => {
          await esArchiver.load('x-pack/test/functional/es_archives/infra/8.0.0/logs_and_metrics');
        });
        after(async () => {
          await esArchiver.unload(
            'x-pack/test/functional/es_archives/infra/8.0.0/logs_and_metrics'
          );
        });
        it('Expression and kind', async () => {
          const location = {
            hash: '',
            pathname: '/stream',
            search: `logFilter=(expression:'service.id:"${SERVICE_ID}"',kind:kuery)`,
            state: undefined,
          };

          await pageObjects.common.navigateToUrlWithBrowserHistory(
            'infraLogs',
            location.pathname,
            location.search,
            {
              ensureCurrentUrl: false,
            }
          );

          await retry.tryForTime(5000, async () => {
            const currentUrl = await browser.getCurrentUrl();
            const parsedUrl = new URL(currentUrl);

            expect(parsedUrl.pathname).to.be('/app/logs/stream');
            expect(parsedUrl.searchParams.get('logFilter')).to.contain(
              `(filters:!(),query:(language:kuery,query:\'service.id:"${SERVICE_ID}"\')`
            );
          });
        });
        it('Top-level query and language', async () => {
          const location = {
            hash: '',
            pathname: '/stream',
            search: `logFilter=(query:'service.id:"${SERVICE_ID}"',language:kuery)`,
            state: undefined,
          };

          await pageObjects.common.navigateToUrlWithBrowserHistory(
            'infraLogs',
            location.pathname,
            location.search,
            {
              ensureCurrentUrl: false,
            }
          );

          await retry.tryForTime(5000, async () => {
            const currentUrl = await browser.getCurrentUrl();
            const parsedUrl = new URL(currentUrl);

            expect(parsedUrl.pathname).to.be('/app/logs/stream');
            expect(parsedUrl.searchParams.get('logFilter')).to.contain(
              `(filters:!(),query:(language:kuery,query:\'service.id:"${SERVICE_ID}"\')`
            );
          });
        });
      });
    });
  });
};
