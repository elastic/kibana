/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Wreck from 'wreck';
import { LogService } from '../../../types/services';

export class Role {
  private log: LogService;
  private wreck: any;

  constructor(url: string, log: LogService) {
    this.log = log;
    this.wreck = Wreck.defaults({
      headers: { 'kbn-xsrf': 'ftr/services/uiSettings' },
      baseUrl: url,
      redirects: 3,
    });
  }

  public async create(name: string, role: any) {
    this.log.debug(`creating role ${name}`);
    const { res, payload } = await this.wreck.put(`/api/security/role/${name}`, { payload: role });
    if (res.statusCode !== 204) {
      throw new Error(`Expected status code of 204, received ${res.statusCode}: ${payload}`);
    }
  }

  public async delete(name: string) {
    this.log.debug(`deleting role ${name}`);
    const { res, payload } = await this.wreck.delete(`/api/security/role/${name}`);
    if (res.statusCode !== 204) {
      throw new Error(`Expected status code of 204, received ${res.statusCode}: ${payload}`);
    }
    this.log.debug(`deleted role ${name}`);
  }
}
