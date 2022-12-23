/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import apmAgent from 'elastic-apm-node';
import { initApm } from '@kbn/apm-config-loader';
// @ts-expect-error we have to check types with "allowJs: false" for now, causing this import to fail
import { REPO_ROOT } from '@kbn/repo-info';

if (!apmAgent.isStarted()) {
  initApm(process.argv, REPO_ROOT, false, 'test-plugin');
}
