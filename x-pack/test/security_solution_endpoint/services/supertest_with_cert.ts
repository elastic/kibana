/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { format as formatUrl } from 'url';
import supertest from 'supertest';
import { FtrProviderContext } from '../ftr_provider_context';

export function KibanaSupertestWithCertProvider({ getService }: FtrProviderContext) {
  const config = getService('config');
  const kibanaServerUrl = formatUrl(config.get('servers.kibana'));
  const ca = config.get('servers.kibana').certificateAuthorities;

  return supertest.agent(kibanaServerUrl, { ca });
}

export function KibanaSupertestWithCertWithoutAuthProvider({ getService }: FtrProviderContext) {
  const config = getService('config');
  const kibanaServerUrl = formatUrl({ ...config.get('servers.kibana'), auth: false });
  const ca = config.get('servers.kibana').certificateAuthorities;

  return supertest.agent(kibanaServerUrl, { ca });
}
