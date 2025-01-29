/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { KBN_CERT_PATH, KBN_KEY_PATH } from '@kbn/dev-utils';
import { createTestConfig } from '../../config.base';

export default createTestConfig({
  serverlessProject: 'security',
  testFiles: [require.resolve('./index.mki_only.ts')],
  junit: {
    reportName: 'Serverless Security MKI Functional Tests',
  },
  suiteTags: { exclude: ['skipSvlSec'] },

  // include settings from project controller
  // https://github.com/elastic/project-controller/blob/main/internal/project/security/config/elasticsearch.yml
  esServerArgs: ['xpack.ml.nlp.enabled=true'],
  kbnServerArgs: [
    '--xpack.dataUsage.enabled=true',
    '--xpack.dataUsage.enableExperimental=[]',
    // dataUsage.autoops* config is set in kibana controller
    '--xpack.dataUsage.autoops.enabled=true',
    '--xpack.dataUsage.autoops.api.url=http://localhost:9000',
    `--xpack.dataUsage.autoops.api.tls.certificate=${KBN_CERT_PATH}`,
    `--xpack.dataUsage.autoops.api.tls.key=${KBN_KEY_PATH}`,
  ],
});
