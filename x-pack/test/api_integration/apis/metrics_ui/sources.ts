/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import {
  SourceResponse,
  InfraSavedSourceConfiguration,
  SourceResponseRuntimeType,
} from '../../../../plugins/infra/common/http_api/source_api';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');
  const SOURCE_API_URL = '/api/metrics/source/default';
  const patchRequest = async (
    body: InfraSavedSourceConfiguration
  ): Promise<SourceResponse | undefined> => {
    const response = await supertest
      .patch(SOURCE_API_URL)
      .set('kbn-xsrf', 'xxx')
      .send(body)
      .expect(200);
    return response.body;
  };

  describe('sources', () => {
    before(() => esArchiver.load('infra/metrics_and_logs'));
    after(() => esArchiver.unload('infra/metrics_and_logs'));
    beforeEach(() => esArchiver.load('empty_kibana'));
    afterEach(() => esArchiver.unload('empty_kibana'));

    describe('patch request', () => {
      it('applies all top-level field updates to an existing source', async () => {
        const creationResponse = await patchRequest({
          name: 'NAME',
        });

        const initialVersion = creationResponse?.source.version;
        const createdAt = creationResponse?.source.updatedAt;

        expect(initialVersion).to.be.a('string');
        expect(createdAt).to.be.greaterThan(0);

        const updateResponse = await patchRequest({
          name: 'UPDATED_NAME',
          description: 'UPDATED_DESCRIPTION',
          metricAlias: 'metricbeat-**',
          logAlias: 'filebeat-**',
        });

        expect(SourceResponseRuntimeType.is(updateResponse)).to.be(true);

        const version = updateResponse?.source.version;
        const updatedAt = updateResponse?.source.updatedAt;
        const configuration = updateResponse?.source.configuration;
        const status = updateResponse?.source.status;

        expect(version).to.be.a('string');
        expect(version).to.not.be(initialVersion);
        expect(updatedAt).to.be.greaterThan(createdAt || 0);
        expect(configuration?.name).to.be('UPDATED_NAME');
        expect(configuration?.description).to.be('UPDATED_DESCRIPTION');
        expect(configuration?.metricAlias).to.be('metricbeat-**');
        expect(configuration?.logAlias).to.be('filebeat-**');
        expect(configuration?.fields.host).to.be('host.name');
        expect(configuration?.fields.pod).to.be('kubernetes.pod.uid');
        expect(configuration?.fields.tiebreaker).to.be('_doc');
        expect(configuration?.fields.timestamp).to.be('@timestamp');
        expect(configuration?.fields.container).to.be('container.id');
        expect(configuration?.logColumns).to.have.length(3);
        expect(configuration?.anomalyThreshold).to.be(50);
        expect(status?.logIndicesExist).to.be(true);
        expect(status?.metricIndicesExist).to.be(true);
      });

      it('applies a single top-level update to an existing source', async () => {
        const creationResponse = await patchRequest({
          name: 'NAME',
        });

        const initialVersion = creationResponse?.source.version;
        const createdAt = creationResponse?.source.updatedAt;

        expect(initialVersion).to.be.a('string');
        expect(createdAt).to.be.greaterThan(0);

        const updateResponse = await patchRequest({
          name: 'UPDATED_NAME',
          description: 'UPDATED_DESCRIPTION',
          metricAlias: 'metricbeat-**',
        });

        const version = updateResponse?.source.version;
        const updatedAt = updateResponse?.source.updatedAt;
        const configuration = updateResponse?.source.configuration;
        const status = updateResponse?.source.status;

        expect(version).to.be.a('string');
        expect(version).to.not.be(initialVersion);
        expect(updatedAt).to.be.greaterThan(createdAt || 0);
        expect(configuration?.metricAlias).to.be('metricbeat-**');
        expect(configuration?.logAlias).to.be('logs-*,filebeat-*,kibana_sample_data_logs*');
        expect(status?.logIndicesExist).to.be(true);
        expect(status?.metricIndicesExist).to.be(true);
      });

      it('applies a single nested field update to an existing source', async () => {
        const creationResponse = await patchRequest({
          name: 'NAME',
          fields: {
            host: 'HOST',
          },
        });

        const initialVersion = creationResponse?.source.version;
        const createdAt = creationResponse?.source.updatedAt;

        expect(initialVersion).to.be.a('string');
        expect(createdAt).to.be.greaterThan(0);

        const updateResponse = await patchRequest({
          fields: {
            container: 'UPDATED_CONTAINER',
          },
        });

        const version = updateResponse?.source.version;
        const updatedAt = updateResponse?.source.updatedAt;
        const configuration = updateResponse?.source.configuration;

        expect(version).to.be.a('string');
        expect(version).to.not.be(initialVersion);
        expect(updatedAt).to.be.greaterThan(createdAt || 0);
        expect(configuration?.fields.container).to.be('UPDATED_CONTAINER');
        expect(configuration?.fields.host).to.be('HOST');
        expect(configuration?.fields.pod).to.be('kubernetes.pod.uid');
        expect(configuration?.fields.tiebreaker).to.be('_doc');
        expect(configuration?.fields.timestamp).to.be('@timestamp');
      });

      it('applies a log column update to an existing source', async () => {
        const creationResponse = await patchRequest({
          name: 'NAME',
        });

        const initialVersion = creationResponse?.source.version;
        const createdAt = creationResponse?.source.updatedAt;

        const updateResponse = await patchRequest({
          logColumns: [
            {
              fieldColumn: {
                id: 'ADDED_COLUMN_ID',
                field: 'ADDED_COLUMN_FIELD',
              },
            },
          ],
        });

        const version = updateResponse?.source.version;
        const updatedAt = updateResponse?.source.updatedAt;
        const configuration = updateResponse?.source.configuration;
        expect(version).to.be.a('string');
        expect(version).to.not.be(initialVersion);
        expect(updatedAt).to.be.greaterThan(createdAt || 0);
        expect(configuration?.logColumns).to.have.length(1);
        expect(configuration?.logColumns[0]).to.have.key('fieldColumn');
        const fieldColumn = (configuration?.logColumns[0] as any).fieldColumn;
        expect(fieldColumn).to.have.property('id', 'ADDED_COLUMN_ID');
        expect(fieldColumn).to.have.property('field', 'ADDED_COLUMN_FIELD');
      });
      it('validates anomalyThreshold is between range 1-100', async () => {
        // create config with bad request
        await supertest
          .patch(SOURCE_API_URL)
          .set('kbn-xsrf', 'xxx')
          .send({ name: 'NAME', anomalyThreshold: -20 })
          .expect(400);
        // create config with good request
        await supertest
          .patch(SOURCE_API_URL)
          .set('kbn-xsrf', 'xxx')
          .send({ name: 'NAME', anomalyThreshold: 20 })
          .expect(200);

        await supertest
          .patch(SOURCE_API_URL)
          .set('kbn-xsrf', 'xxx')
          .send({ anomalyThreshold: -2 })
          .expect(400);
        await supertest
          .patch(SOURCE_API_URL)
          .set('kbn-xsrf', 'xxx')
          .send({ anomalyThreshold: 101 })
          .expect(400);
      });
    });
  });
}
