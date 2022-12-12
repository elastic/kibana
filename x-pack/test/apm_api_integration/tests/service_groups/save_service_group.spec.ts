/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { ApmApiError } from '../../common/apm_api_supertest';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { expectToReject } from '../../common/utils/expect_to_reject';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');

  async function createServiceGroupApi({
    serviceGroupId,
    groupName,
    kuery,
    description,
    color,
  }: {
    serviceGroupId?: string;
    groupName: string;
    kuery: string;
    description?: string;
    color?: string;
  }) {
    const response = await apmApiClient.writeUser({
      endpoint: 'POST /internal/apm/service-group',
      params: {
        query: {
          serviceGroupId,
        },
        body: {
          groupName,
          kuery,
          description,
          color,
        },
      },
    });
    return response;
  }

  async function getServiceGroupsApi() {
    return apmApiClient.writeUser({
      endpoint: 'GET /internal/apm/service-groups',
    });
  }

  async function deleteAllServiceGroups() {
    return await getServiceGroupsApi().then((response) => {
      const promises = response.body.serviceGroups.map((item) => {
        if (item.id) {
          return apmApiClient.writeUser({
            endpoint: 'DELETE /internal/apm/service-group',
            params: { query: { serviceGroupId: item.id } },
          });
        }
      });
      return Promise.all(promises);
    });
  }

  registry.when('Service group create', { config: 'basic', archives: [] }, () => {
    afterEach(deleteAllServiceGroups);

    it('creates a new service group', async () => {
      const serviceGroup = {
        groupName: 'synthbeans',
        kuery: 'service.name: synth*',
      };
      const createResponse = await createServiceGroupApi(serviceGroup);
      expect(createResponse.status).to.be(200);
      expect(createResponse.body).to.have.property('id');
      expect(createResponse.body).to.have.property('groupName', serviceGroup.groupName);
      expect(createResponse.body).to.have.property('kuery', serviceGroup.kuery);
      expect(createResponse.body).to.have.property('updatedAt');
      const serviceGroupsResponse = await getServiceGroupsApi();
      expect(serviceGroupsResponse.body.serviceGroups.length).to.be(1);
    });

    it('handles invalid fields with error response', async () => {
      const err = await expectToReject<ApmApiError>(() =>
        createServiceGroupApi({
          groupName: 'synthbeans',
          kuery: 'service.name: synth* or transaction.type: request',
        })
      );

      expect(err.res.status).to.be(400);
      expect(err.res.body.message).to.contain('transaction.type');
    });
  });
}
