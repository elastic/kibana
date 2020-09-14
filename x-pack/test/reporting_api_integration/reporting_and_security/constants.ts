/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { REPO_ROOT } from '@kbn/dev-utils';
import path from 'path';

export const OSS_KIBANA_ARCHIVE_PATH = path.resolve(
  REPO_ROOT,
  'test/functional/fixtures/es_archiver/dashboard/current/kibana'
);
export const OSS_DATA_ARCHIVE_PATH = path.resolve(
  REPO_ROOT,
  'test/functional/fixtures/es_archiver/dashboard/current/data'
);
