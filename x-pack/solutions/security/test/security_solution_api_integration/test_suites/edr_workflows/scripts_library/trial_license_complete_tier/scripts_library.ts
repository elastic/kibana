/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type TestAgent from 'supertest/lib/agent';
import type { FtrProviderContext } from '../../../../ftr_provider_context_edr_workflows';

export default function ({ getService }: FtrProviderContext) {
  const utils = getService('securitySolutionUtils');
  const endpointTestresources = getService('endpointTestResources');

  describe('@ess @serverless @skipInServerlessMKI Endpoint Scripts Library', function () {
    let adminSupertest: TestAgent;

    before(async () => {
      adminSupertest = await utils.createSuperTest();
    });

    describe('Create API', () => {
      // TODO: implement
    });

    describe('Update API', () => {
      // TODO: implement
    });

    describe('List API', () => {
      // TODO: implement
    });

    describe('Delete API', () => {});

    describe('Get one API', () => {});

    describe('Download API', () => {});
  });
}
