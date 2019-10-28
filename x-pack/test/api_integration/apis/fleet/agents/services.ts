/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import supertestAsPromised from 'supertest-as-promised';
import url from 'url';

import { FtrProviderContext } from '../../../ftr_provider_context';

export function getSupertestWithoutAuth({ getService }: FtrProviderContext) {
  const config = getService('config');
  const kibanaUrl = config.get('servers.kibana');
  kibanaUrl.auth = null;
  kibanaUrl.password = null;

  return supertestAsPromised(url.format(kibanaUrl));
}
