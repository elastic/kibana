/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { format as formatUrl } from 'url';
import { Role } from './role';
import { User } from './user';

export function SecurityProvider({ getService }) {
  const log = getService('log');
  const config = getService('config');

  return new class Security {
    constructor() {
      const url = formatUrl(config.get('servers.kibana'));
      this.role = new Role(url, log);
      this.user = new User(url, log);
    }
  };
}
