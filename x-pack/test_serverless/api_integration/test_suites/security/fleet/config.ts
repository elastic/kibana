/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTestConfig } from '../../../config.base';

export default createTestConfig({
  serverlessProject: 'security',
  testFiles: [require.resolve('./fleet')],
  junit: {
    reportName: 'Fleet Serverless Security API Integration Tests',
  },
  suiteTags: { exclude: ['skipSvlSec'] },

  // include settings from project controller
  // https://github.com/elastic/project-controller/blob/main/internal/project/security/config/elasticsearch.yml
  esServerArgs: ['xpack.ml.nlp.enabled=false'],

  kbnServerArgs: [
    '--xpack.cloud.serverless.project_id=ftr_fake_project_id',
    `--xpack.fleet.fleetServerHosts=[${JSON.stringify({
      id: 'default-fleet-server',
      name: 'Default Fleet Server',
      is_default: true,
      host_urls: ['https://localhost:8220'],
    })}]`,
    `--xpack.fleet.outputs=[${JSON.stringify({
      id: 'es-default-output',
      name: 'Default Output',
      type: 'elasticsearch',
      is_default: true,
      is_default_monitoring: true,
      hosts: ['https://localhost:9200'],
    })}]`,
  ],
});
