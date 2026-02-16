/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cleanup, generate } from '@kbn/data-forge';
import expect from '@kbn/expect';
import type { RoleCredentials } from '@kbn/ftr-common-functional-services';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import { DEFAULT_SLO } from './fixtures/slo';
import { DATA_FORGE_CONFIG } from './helpers/dataforge';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const esClient = getService('es');
  const sloApi = getService('sloApi');
  const logger = getService('log');
  const samlAuth = getService('samlAuth');
  const dataViewApi = getService('dataViewApi');

  const DATA_VIEW = 'kbn-data-forge-fake_hosts.fake_hosts-*';
  const DATA_VIEW_ID = 'data-view-id';

  let adminRoleAuthc: RoleCredentials;

  describe('AI Bulk Create SLOs', function () {
    before(async () => {
      adminRoleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('admin');

      await generate({ client: esClient, config: DATA_FORGE_CONFIG, logger });

      await dataViewApi.create({
        roleAuthc: adminRoleAuthc,
        name: DATA_VIEW,
        id: DATA_VIEW_ID,
        title: DATA_VIEW,
      });

      await sloApi.deleteAllSLOs(adminRoleAuthc);
    });

    after(async () => {
      await dataViewApi.delete({ roleAuthc: adminRoleAuthc, id: DATA_VIEW_ID });
      await cleanup({ client: esClient, config: DATA_FORGE_CONFIG, logger });
      await sloApi.deleteAllSLOs(adminRoleAuthc);
      await samlAuth.invalidateM2mApiKeyWithRoleScope(adminRoleAuthc);
    });

    it('successfully creates multiple SLOs in bulk', async () => {
      const slos = [
        { ...DEFAULT_SLO, name: 'Bulk SLO 1' },
        { ...DEFAULT_SLO, name: 'Bulk SLO 2' },
        { ...DEFAULT_SLO, name: 'Bulk SLO 3' },
      ];

      const response = await sloApi.aiBulkCreate(slos, adminRoleAuthc);

      expect(response).to.have.property('results');
      expect(response).to.have.property('summary');
      expect(response.summary.total).to.be(3);
      expect(response.summary.success).to.be(3);
      expect(response.summary.failure).to.be(0);
      expect(response.results).to.have.length(3);

      for (const result of response.results) {
        expect(result.success).to.be(true);
        expect(result).to.have.property('id');
        expect(result).to.have.property('name');
      }
    });

    it('returns individual errors for invalid SLO definitions', async () => {
      const slos = [
        { ...DEFAULT_SLO, name: 'Valid SLO' },
        {
          ...DEFAULT_SLO,
          name: 'Invalid SLO',
          indicator: {
            type: 'sli.kql.custom',
            params: {
              index: 'nonexistent-index-that-should-not-exist-*',
              filter: '',
              good: 'status: 200',
              total: '*',
              timestampField: '@timestamp',
            },
          },
        },
      ];

      const response = await sloApi.aiBulkCreate(slos, adminRoleAuthc);

      expect(response).to.have.property('results');
      expect(response).to.have.property('summary');
      expect(response.summary.total).to.be(2);
      expect(response.results).to.have.length(2);

      const validResult = response.results.find(
        (r: { name: string }) => r.name === 'Valid SLO'
      );
      expect(validResult?.success).to.be(true);
    });

    it('returns results with correct structure', async () => {
      const slos = [{ ...DEFAULT_SLO, name: 'Structure Test SLO' }];

      const response = await sloApi.aiBulkCreate(slos, adminRoleAuthc);

      expect(response.results[0]).to.have.property('success');
      expect(response.results[0]).to.have.property('name');
      expect(response.results[0].success).to.be(true);
      expect(response.results[0].name).to.be('Structure Test SLO');
      expect(response.results[0]).to.have.property('id');

      expect(response.summary).to.have.property('total');
      expect(response.summary).to.have.property('success');
      expect(response.summary).to.have.property('failure');
    });

    it('creates SLOs that are retrievable via the standard API', async () => {
      const slos = [{ ...DEFAULT_SLO, name: 'Retrievable Bulk SLO' }];

      const response = await sloApi.aiBulkCreate(slos, adminRoleAuthc);
      expect(response.summary.success).to.be(1);

      const createdId = response.results[0].id;
      const getSloResponse = await sloApi.get(createdId, adminRoleAuthc);

      expect(getSloResponse.name).to.be('Retrievable Bulk SLO');
      expect(getSloResponse).to.have.property('id');
      expect(getSloResponse.id).to.be(createdId);
    });

    it('handles empty array gracefully', async () => {
      const response = await sloApi.aiBulkCreate([], adminRoleAuthc);

      expect(response.summary.total).to.be(0);
      expect(response.summary.success).to.be(0);
      expect(response.summary.failure).to.be(0);
      expect(response.results).to.have.length(0);
    });

    it('rejects requests with invalid body schema', async () => {
      const supertestWithoutAuth = getService('supertestWithoutAuth');

      await supertestWithoutAuth
        .post(`/internal/slo/ai/bulk-create`)
        .set(adminRoleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ invalid: 'body' })
        .expect(400);
    });
  });
}
