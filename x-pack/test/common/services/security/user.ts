/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import axios, { AxiosInstance } from 'axios';
import util from 'util';
import { LogService } from '../../../types/services';

export class User {
  private log: LogService;
  private axios: AxiosInstance;

  constructor(url: string, log: LogService) {
    this.log = log;
    this.axios = axios.create({
      headers: { 'kbn-xsrf': 'x-pack/ftr/services/security/user' },
      baseURL: url,
      maxRedirects: 0,
      validateStatus: () => true, // we do our own validation below and throw better error messages
    });
  }

  public async create(username: string, user: any) {
    this.log.debug(`creating user ${username}`);
    const { data, status, statusText } = await this.axios.post(
      `/api/security/v1/users/${username}`,
      {
        username,
        ...user,
      }
    );
    if (status !== 200) {
      throw new Error(
        `Expected status code of 200, received ${status} ${statusText}: ${util.inspect(data)}`
      );
    }
    this.log.debug(`created user ${username}`);
  }

  public async delete(username: string) {
    this.log.debug(`deleting user ${username}`);
    const { data, status, statusText } = await this.axios.delete(
      `/api/security/v1/users/${username}`
    );
    if (status !== 204) {
      throw new Error(
        `Expected status code of 204, received ${status} ${statusText}: ${util.inspect(data)}`
      );
    }
    this.log.debug(`deleted user ${username}`);
  }
}
