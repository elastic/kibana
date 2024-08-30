/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrService } from '@kbn/ftr-common-functional-services/services/ftr_provider_context';

export class SpacesService extends FtrService {
  private readonly kibanaServer = this.ctx.getService('kibanaServer');
  private readonly log = this.ctx.getService('log');
  private readonly TEST_SPACE_1 = 'test1';

  public getDefaultTestSpace() {
    return this.TEST_SPACE_1;
  }

  public async createTestSpace(id: string, name: string = id) {
    try {
      await this.kibanaServer.spaces.create({
        id,
        name,
      });
    } catch (err) {
      this.log.error(`failed to create space with 'id=${id}': ${err}`);
    }
    return id;
  }
}
