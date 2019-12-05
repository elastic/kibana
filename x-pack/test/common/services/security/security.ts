/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { format as formatUrl } from 'url';

import { Role } from './role';
import { User } from './user';
import { FtrProviderContext } from '../../ftr_provider_context';

export function SecurityServiceProvider({ getService }: FtrProviderContext) {
  const log = getService('log');
  const config = getService('config');
  const url = formatUrl(config.get('servers.kibana'));

  return new (class SecurityService {
    role = new Role(url, log);
    user = new User(url, log);
  })();
}
