/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Wreck from 'wreck';
import { LogService } from '../../../types/services';

export class User {
  private log: LogService;
  private wreck: any;

  constructor(url: string, log: LogService) {
    this.log = log;
    this.wreck = Wreck.defaults({
      headers: { 'kbn-xsrf': 'x-pack/ftr/services/security/user' },
      baseUrl: url,
      redirects: 3,
    });
  }

  public async create(username: string, user: any) {
    this.log.debug(`creating user ${username}`);
    const { res, payload } = await this.wreck.post(`/api/security/v1/users/${username}`, {
      payload: {
        username,
        ...user,
      },
    });
    if (res.statusCode !== 200) {
      throw new Error(`Expected status code of 200, received ${res.statusCode}: ${payload}`);
    }
  }

  public async delete(username: string) {
    this.log.debug(`deleting user ${username}`);
    const { res, payload } = await this.wreck.delete(`/api/security/v1/users/${username}`);
    if (res.statusCode !== 204) {
      throw new Error(`Expected status code of 204, received ${res.statusCode}: ${payload}`);
    }
    this.log.debug(`deleted user ${username}`);
  }
}
