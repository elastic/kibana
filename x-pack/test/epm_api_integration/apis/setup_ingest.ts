/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { FtrProviderContext } from '../../api_integration/ftr_provider_context';
import { setupRouteService } from '../../../plugins/ingest_manager/common';

/**
 * This class is a helper for setting up the ingest manager plugin. It should be used by other plugins that rely on
 * the ingest manager's functionality.
 */
export class IngestInitializer {
  private readonly supertest: any;
  constructor({ getService }: FtrProviderContext) {
    this.supertest = getService('supertest');
  }

  /**
   * This should be called in a test suite's `before` function. It will install the default packages.
   */
  async before() {
    await this.supertest
      .post(setupRouteService.getSetupPath())
      .set({ accept: 'application/json', 'kbn-xsrf': 'some-xsrf-token' })
      .expect(200);
  }
}
