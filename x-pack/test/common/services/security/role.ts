/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import axios, { AxiosInstance } from 'axios';
import util from 'util';
import { LogService } from '../../../types/services';

export class Role {
  private log: LogService;
  private axios: AxiosInstance;

  constructor(url: string, log: LogService) {
    this.log = log;
    this.axios = axios.create({
      headers: { 'kbn-xsrf': 'x-pack/ftr/services/security/role' },
      baseURL: url,
      maxRedirects: 0,
      validateStatus: () => true, // we do our own validation below and throw better error messages
    });
  }

  public async create(name: string, role: any) {
    this.log.debug(`creating role ${name}`);
    const { data, status, statusText } = await this.axios.put(`/api/security/role/${name}`, role);
    if (status !== 204) {
      throw new Error(
        `Expected status code of 204, received ${status} ${statusText}: ${util.inspect(data)}`
      );
    }
    this.log.debug(`created role ${name}`);
  }

  public async delete(name: string) {
    this.log.debug(`deleting role ${name}`);
    const { data, status, statusText } = await this.axios.delete(`/api/security/role/${name}`);
    if (status !== 204 && status !== 404) {
      throw new Error(
        `Expected status code of 204 or 404, received ${status} ${statusText}: ${util.inspect(
          data
        )}`
      );
    }
    this.log.debug(`deleted role ${name}`);
  }
}
