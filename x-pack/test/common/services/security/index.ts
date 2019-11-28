/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { format as formatUrl } from 'url';
import { ToolingLog } from '@kbn/dev-utils';
import { GenericFtrProviderContext } from '@kbn/test/types/ftr';
import { Role } from './role';
import { User } from './user';

export class SecurityService {
  public role: Role;
  public user: User;

  constructor(url: string, log: ToolingLog) {
    this.role = new Role(url, log);
    this.user = new User(url, log);
  }
}

export function SecurityServiceProvider({ getService }: GenericFtrProviderContext<{}, {}>) {
  const log = getService('log');
  const config = getService('config');
  const url = formatUrl(config.get('servers.kibana'));

  return new SecurityService(url, log);
}
