/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Context } from 'mocha';
import { ToolingLog } from '@kbn/dev-utils';

export function warnAndSkipTest(mochaContext: Context, log: ToolingLog) {
  log.warning(
    'disabling tests because DockerServers service is not enabled, set INGEST_MANAGEMENT_PACKAGE_REGISTRY_PORT to run them'
  );
  mochaContext.skip();
}
