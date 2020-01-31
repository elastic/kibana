/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';

const kibanaURL = '/app/kibana';
const url = require('url');

// KIBANAURL is the same env var used by setenv.sh
// TODO: Change the user back to power/changeme.  https://github.com/elastic/x-pack-kibana/issues/2948
const TEST_KIBANA_URL = url.parse(
  process.env.KIBANAURL ? process.env.KIBANAURL : 'http://elastic:changeit@localhost:5601'
);
const TEST_KIBANA_USERNAME = TEST_KIBANA_URL.auth.split(':')[0] || 'elastic';
const TEST_KIBANA_PASSWORD = TEST_KIBANA_URL.auth.split(':')[1] || 'changeit';

// ESURL is the same env var used by setenv.sh
const TEST_ES_URL = url.parse(
  process.env.ESURL ? process.env.ESURL : 'http://elastic:changeit@localhost:9200'
);
const TEST_ES_USERNAME = TEST_ES_URL.auth.split(':')[0] || 'elastic';
const TEST_ES_PASSWORD = TEST_ES_URL.auth.split(':')[1] || 'changeit';

export default () => {
  return {
    servers: {
      kibana: {
        protocol: process.env.KIBANAPROTO || TEST_KIBANA_URL.protocol.replace(':', ''),
        hostname: process.env.KIBANAHOST || TEST_KIBANA_URL.hostname,
        // kibanaip is used for reporting_watcher test
        // kibanaip: process.env.KIBANAIP || TEST_KIBANA_URL.hostname,
        port: parseInt(process.env.KIBANAPORT, 10) || parseInt(TEST_KIBANA_URL.port, 10),
        username: TEST_KIBANA_USERNAME,
        password: TEST_KIBANA_PASSWORD,
        auth: `${TEST_KIBANA_USERNAME}:${TEST_KIBANA_PASSWORD}`,
      },
      elasticsearch: {
        protocol: process.env.TEST_ES_PROTOCOL || TEST_ES_URL.protocol.replace(':', ''),
        hostname: process.env.TEST_ES_HOSTNAME || TEST_ES_URL.hostname,
        port: parseInt(process.env.TEST_ES_PORT, 10) || parseInt(TEST_ES_URL.port, 10),
        username: TEST_ES_USERNAME,
        password: TEST_ES_PASSWORD,
        auth: `${TEST_ES_USERNAME}:${TEST_ES_PASSWORD}`,
      },
    },
    apps: {
      // status_page: {
      //   pathname: '/status'
      // },
      discover: {
        pathname: kibanaURL,
        hash: '/discover',
      },
      // visualize: {
      //   pathname: kibanaURL,
      //   hash: '/visualize'
      // },
      // dashboard: {
      //   pathname: kibanaURL,
      //   hash: '/dashboard'
      // },
      settings: {
        pathname: kibanaURL,
        hash: '/management',
      },
      // console: {
      //   pathname: kibanaURL,
      //   hash: '/dev_tools'
      // },
      monitoring: {
        pathname: '/app/monitoring',
      },
      // graph: {
      //   pathname: 'app/graph'
      // },
      // code: {
      //   pathname: '/app/code',
      //   hash: '/admin',
      // },
      sampledata: {
        pathname: '/app/kibana',
        hash: '/home/tutorial_directory/sampleData',
      },
    },
    // screenshots: {
    //   directory: resolve(__dirname, 'screenshots'),
    // },
    // esIndexDump: {
    //   dataDir: resolve(__dirname, 'fixtures/dump_data'),
    // },
  };
};
