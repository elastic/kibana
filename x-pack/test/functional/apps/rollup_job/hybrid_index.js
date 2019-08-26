/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


export default function ({ getService, getPageObjects }) {

  const log = getService('log');
  const es = getService('es');
  const PageObjects = getPageObjects(['security', 'rollup', 'common', 'indexManagement']);

  const createRollupJobBody = {
    'index_pattern': 'sensor-*',
    'rollup_index': 'sensor_rollup',
    'cron': '9,19,29,39,49,59  * * * * ?',
    'page_size': 1000,
    'groups': {
      'date_histogram': {
        'field': 'timestamp',
        'fixed_interval': '1h',
        'delay': '10s'
      },
      'terms': {
        'fields': ['node']
      }
    },
    'metrics': [
      {
        'field': 'temperature',
        'metrics': ['min', 'max', 'sum']
      },
      {
        'field': 'voltage',
        'metrics': ['avg']
      }
    ]
  };

  console.log(log, es, createRollupJobBody);
  describe('rollup jobs', function () {
    before(async () => {
      // make sure all dates have the same concept of 'now'
      await PageObjects.common.navigateToUrl('home', 'tutorial_directory/sampleData');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.home.addSampleDataSet('logs');

      // es.transport.request({
      //   path: `/_rollup/job/sample_rollup`,
      //   method: 'PUT',
      //   body: createRollupJobBody
      // });


    });
    after(async () => {
      // await es.indices.delete({ index: 'to-be*' });
      // await es.indices.delete({ index: 'rollup*' });
    });
  });
}
