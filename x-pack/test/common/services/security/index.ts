/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { format as formatUrl } from 'url';
import { KibanaFunctionalTestDefaultProviders } from '../../../types/providers';
import { LogService } from '../../../types/services';
import { Role } from './role';
import { User } from './user';

export class SecurityService {
  public role: Role;
  public user: User;

  constructor(url: string, log: LogService) {
    this.role = new Role(url, log);
    this.user = new User(url, log);
  }
}

export function SecurityServiceProvider({ getService }: KibanaFunctionalTestDefaultProviders) {
  const log = getService('log');
  const config = getService('config');
  const url = formatUrl(config.get('servers.kibana'));

  return new SecurityService(url, log);
}
