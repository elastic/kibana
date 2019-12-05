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

export async function SecurityServiceProvider({ getService }: GenericFtrProviderContext<{}, {}>) {
  const log = getService('log');
  const config = getService('config');
  const url = formatUrl(config.get('servers.kibana'));

  const secService = await new SecurityService(url, log);
  try {
  //delete the test_user if present (will it error if the user doesn't exist?)
    await secService.user.delete('test_user');
  } catch (exception){}
   console.log(config.get('security.roles'));
   console.log(JSON.stringify(config.get('security.roles[0]')));

  //create the defined roles (need to map array to create roles)
  // await secService.role.create(config.get('security.roles[0].name'), config.get('security.roles[0].definition'));
  // //create test_user with username and pwd
  // await secServices.user.create('test_user', {
  //   password: 'changeme',
  //   roles: ['data_reader', 'kibana_user'],
  //   full_name: 'test user',
  // });

  return secService;
}
