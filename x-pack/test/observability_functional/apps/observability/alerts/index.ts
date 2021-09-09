/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import querystring from 'querystring';
import { FtrProviderContext } from '../../../ftr_provider_context';

// Based on the x-pack/test/functional/es_archives/observability/alerts archive.
const DATE_WITH_DATA = {
  rangeFrom: '2021-08-31T13:36:22.109Z',
  rangeTo: '2021-09-01T13:36:22.109Z',
};

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');

  // FLAKY: https://github.com/elastic/kibana/issues/110920
  describe.skip('Observability alerts', function () {
    this.tags('includeFirefox');

    const pageObjects = getPageObjects(['common']);
    const testSubjects = getService('testSubjects');

    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/observability/alerts');
      await pageObjects.common.navigateToUrlWithBrowserHistory(
        'observability',
        '/alerts',
        `?${querystring.stringify(DATE_WITH_DATA)}`
      );
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/observability/alerts');
    });

    describe('Alerts table', () => {
      it('Renders the table', async () => {
        await testSubjects.existOrFail('events-viewer-panel');
      });

      it('Renders the correct number of cells', async () => {
        // NOTE: This isn't ideal, but EuiDataGrid doesn't really have the concept of "rows"
        const cells = await testSubjects.findAll('dataGridRowCell');
        expect(cells.length).to.be(54);
      });
    });
  });
};
