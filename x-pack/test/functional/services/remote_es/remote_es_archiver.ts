/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EsArchiver } from '@kbn/es-archiver';
import { FtrProviderContext } from '../../ftr_provider_context';

export function RemoteEsArchiverProvider({ getService }: FtrProviderContext): EsArchiver {
  const remoteEs = getService('remoteEs' as 'es');
  const log = getService('log');
  const kibanaServer = getService('kibanaServer');

  return new EsArchiver({
    client: remoteEs,
    log,
    kbnClient: kibanaServer,
  });
}
