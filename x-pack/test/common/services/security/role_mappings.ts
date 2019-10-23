/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import axios, { AxiosInstance } from 'axios';
import util from 'util';
import { ToolingLog } from '@kbn/dev-utils';
import { RoleMapping } from '../../../../legacy/plugins/security/common/model';

export class RoleMappings {
  private log: ToolingLog;
  private axios: AxiosInstance;

  constructor(url: string, log: ToolingLog) {
    this.log = log;
    this.axios = axios.create({
      headers: { 'kbn-xsrf': 'x-pack/ftr/services/security/role_mappings' },
      baseURL: url,
      maxRedirects: 0,
      validateStatus: () => true, // we do our own validation below and throw better error messages
    });
  }

  public async create(name: string, roleMapping: Omit<RoleMapping, 'name'>) {
    this.log.debug(`creating role mapping ${name}`);
    const { data, status, statusText } = await this.axios.post(
      `/internal/security/role_mapping/${name}`,
      roleMapping
    );
    if (status !== 200) {
      throw new Error(
        `Expected status code of 200, received ${status} ${statusText}: ${util.inspect(data)}`
      );
    }
    this.log.debug(`created role mapping ${name}`);
  }

  public async delete(name: string) {
    this.log.debug(`deleting role mapping ${name}`);
    const { data, status, statusText } = await this.axios.delete(
      `/internal/security/role_mapping/${name}`
    );
    if (status !== 200 && status !== 404) {
      throw new Error(
        `Expected status code of 200 or 404, received ${status} ${statusText}: ${util.inspect(
          data
        )}`
      );
    }
    this.log.debug(`deleted role mapping ${name}`);
  }
}
