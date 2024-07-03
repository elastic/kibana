/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FtrService } from './ftr_provider_context';

export interface IntegrationPackage {
  name: string;
  version: string;
}

export class PackageService extends FtrService {
  private readonly supertest = this.ctx.getService('supertest');

  async uninstallPackage({ name, version }: IntegrationPackage) {
    return this.supertest
      .delete(`/api/fleet/epm/packages/${name}/${version}`)
      .set('kbn-xsrf', 'xxxx');
  }

  async installPackage({ name, version }: IntegrationPackage) {
    return this.supertest
      .post(`/api/fleet/epm/packages/${name}/${version}`)
      .set('kbn-xsrf', 'xxxx')
      .send({ force: true });
  }
}
