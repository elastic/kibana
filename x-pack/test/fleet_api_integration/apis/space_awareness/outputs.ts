/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';
import { SpaceTestApiClient } from './api_helper';
import { cleanFleetIndices, createFleetAgent } from './helpers';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const esClient = getService('es');
  const kibanaServer = getService('kibanaServer');
  const spaces = getService('spaces');
  const TEST_SPACE_1 = 'test1';

  describe('outputs', function () {
    skipIfNoDockerRegistry(providerContext);
    const apiClient = new SpaceTestApiClient(supertest);

    describe('With Fleet server setup in a specific space', () => {
      before(async () => {
        await kibanaServer.savedObjects.cleanStandardList();
        await kibanaServer.savedObjects.cleanStandardList({
          space: TEST_SPACE_1,
        });
        await cleanFleetIndices(esClient);
        await apiClient.postEnableSpaceAwareness();
        await apiClient.setup();
        await spaces.createTestSpace(TEST_SPACE_1);
        const testSpaceFleetServerPolicy = await apiClient.createFleetServerPolicy(TEST_SPACE_1);
        await createFleetAgent(esClient, testSpaceFleetServerPolicy.item.id, TEST_SPACE_1);
      });

      after(async () => {
        await kibanaServer.savedObjects.cleanStandardList();
        await kibanaServer.savedObjects.cleanStandardList({
          space: TEST_SPACE_1,
        });
        await cleanFleetIndices(esClient);
      });

      it('should allow to create a default logstash output', async () => {
        await apiClient.postOutput(
          {
            type: 'logstash',
            name: 'test logstash',
            hosts: ['test.fr:443'],
            is_default: true,
            is_default_monitoring: true,
            ssl: {
              certificate: 'CERTIFICATE',
              key: 'KEY',
              certificate_authorities: ['CA1', 'CA2'],
            },
          },
          TEST_SPACE_1
        );
      });
    });
  });
}
