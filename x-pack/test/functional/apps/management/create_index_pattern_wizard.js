/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export default function ({ getService, getPageObjects }) {
  const kibanaServer = getService('kibanaServer');
  const es = getService('legacyEs');
  const PageObjects = getPageObjects(['settings', 'common']);

  describe('"Create Index Pattern" wizard', function () {
    before(async function () {
      // delete .kibana index and then wait for Kibana to re-create it
      await kibanaServer.uiSettings.replace({});
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickKibanaIndexPatterns();
    });

    describe('data streams', () => {
      it('can be an index pattern', async () => {
        await es.transport.request({
          path: '/_index_template/generic-logs',
          method: 'PUT',
          body: {
            index_patterns: ['logs-*', 'test_data_stream'],
            template: {
              mappings: {
                properties: {
                  '@timestamp': {
                    type: 'date',
                  },
                },
              },
            },
            data_stream: {},
          },
        });

        await es.transport.request({
          path: '/_data_stream/test_data_stream',
          method: 'PUT',
        });

        await PageObjects.settings.createIndexPattern('test_data_stream', false);

        await es.transport.request({
          path: '/_data_stream/test_data_stream',
          method: 'DELETE',
        });
      });
    });
  });
}
