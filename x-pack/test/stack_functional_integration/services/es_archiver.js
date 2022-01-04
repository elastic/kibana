/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';

import { EsArchiver } from '@kbn/es-archiver';
import { REPO_ROOT } from '@kbn/utils';

import * as KibanaServer from '../../../../test/common/services/kibana_server';

const INTEGRATION_TEST_ROOT =
  process.env.WORKSPACE || Path.resolve(REPO_ROOT, '../integration-test');

export function EsArchiverProvider({ getService }) {
  const config = getService('config');
  const client = getService('es');
  const log = getService('log');
  const kibanaServer = getService('kibanaServer');
  const retry = getService('retry');

  const esArchiver = new EsArchiver({
    baseDir: INTEGRATION_TEST_ROOT,
    client,
    log,
    kbnClient: kibanaServer,
  });

  KibanaServer.extendEsArchiver({
    esArchiver,
    kibanaServer,
    retry,
    defaults: config.get('uiSettings.defaults'),
  });

  return esArchiver;
}
