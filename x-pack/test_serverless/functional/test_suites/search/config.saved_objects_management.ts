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
  serverlessProject: 'es',
  testFiles: [require.resolve('../common/saved_objects_management')],
  junit: {
    reportName: 'Serverless Search Saved Objects Management Functional Tests',
  },
  kbnServerArgs: findTestPluginPaths([
    resolve(REPO_ROOT, 'test/plugin_functional/plugins/saved_object_import_warnings'),
    resolve(REPO_ROOT, 'test/plugin_functional/plugins/saved_object_export_transforms'),
    resolve(REPO_ROOT, 'test/plugin_functional/plugins/saved_objects_hidden_from_http_apis_type'),
    resolve(REPO_ROOT, 'test/plugin_functional/plugins/saved_objects_hidden_type'),
  ]),

  // include settings from project controller
  // https://github.com/elastic/project-controller/blob/main/internal/project/esproject/config/elasticsearch.yml
  esServerArgs: [],
});
