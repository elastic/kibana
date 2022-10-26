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
  const supertest = getService('supertest');

  async function callApi({
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
          groupName: groupName,
          kuery: kuery,
          description,
          color,
        },
      },
    });
    return response;
  }

  type SavedObjectsFindResults = Array<{
    id: string;
    type: string;
  }>;

  async function deleteServiceGroups() {
    const response = await supertest
      .get('/api/saved_objects/_find?type=apm-service-group')
      .set('kbn-xsrf', 'true');
    const savedObjects: SavedObjectsFindResults = response.body.saved_objects;
    const bulkDeleteBody = savedObjects.map(({ id, type }) => ({ id, type }));
    return supertest
      .post(`/api/saved_objects/_bulk_delete?force=true`)
      .set('kbn-xsrf', 'foo')
      .send(bulkDeleteBody);
  }

  registry.when('Service group create', { config: 'basic', archives: [] }, () => {
    afterEach(deleteServiceGroups);

    it('creates a new service group', async () => {
      const response = await callApi({
        groupName: 'synthbeans',
        kuery: 'service.name: synth*',
      });
      expect(response.status).to.be(200);
      expect(Object.keys(response.body).length).to.be(0);
    });

    it('handles invalid fields with error response', async () => {
      const err = await expectToReject<ApmApiError>(() =>
        callApi({
          groupName: 'synthbeans',
          kuery: 'service.name: synth* or transaction.type: request',
        })
      );

      expect(err.res.status).to.be(400);
      expect(err.res.body.message).to.contain('transaction.type');
    });
  });
}
