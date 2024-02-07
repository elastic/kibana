/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { REPO_ROOT } from '@kbn/repo-info';
import { findTestPluginPaths } from '@kbn/test';
import { resolve } from 'path';
import { createTestConfig } from '../../config.base';

export default createTestConfig({
  serverlessProject: 'oblt',
  testFiles: [require.resolve('../common/examples')],
  junit: {
    reportName: 'Serverless Observability Examples Functional Tests',
  },
  kbnServerArgs: findTestPluginPaths([
    resolve(REPO_ROOT, 'examples'),
    resolve(REPO_ROOT, 'x-pack/examples'),
  ]),

  // include settings from project controller
  // https://github.com/elastic/project-controller/blob/main/internal/project/observability/config/elasticsearch.yml
  esServerArgs: ['xpack.ml.dfa.enabled=false', 'xpack.ml.nlp.enabled=false'],
});
