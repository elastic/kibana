/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { FtrProviderContext } from '../../api_integration/ftr_provider_context';
import { setupRouteService } from '../../../plugins/ingest_manager/common';
import { FakePackageRegistry } from './fake_registry';

/**
 * This class is a helper for setting up the ingest manager plugin. It should be used by other plugins that rely on
 * the ingest manager's functionality.
 */
export class IngestInitializer {
  private readonly registry = new FakePackageRegistry();
  private readonly supertest: any;
  constructor({ getService }: FtrProviderContext) {
    this.supertest = getService('supertest');
  }

  /**
   * This should be called in a test suite's `before` function. It will install the default packages.
   */
  async before() {
    this.registry.start();
    await this.supertest
      .post(setupRouteService.getSetupPath())
      .set({ accept: 'application/json', 'kbn-xsrf': 'some-xsrf-token' })
      .expect(200);
  }

  /**
   * This should be called in a test suite's `after` function. It will shutdown the fake registry server.
   */
  after() {
    this.registry.stop();
  }
}
