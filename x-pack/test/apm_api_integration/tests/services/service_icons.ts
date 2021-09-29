/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import url from 'url';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import archives from '../../common/fixtures/es_archiver/archives_metadata';
import { registry } from '../../common/registry';

export default function ApiTest({ getService }: FtrProviderContext) {
  const supertest = getService('legacySupertestAsApmReadUser');

  const archiveName = 'apm_8.0.0';
  const { start, end } = archives[archiveName];

  registry.when('Service icons when data is not loaded', { config: 'basic', archives: [] }, () => {
    it('handles the empty state', async () => {
      const response = await supertest.get(
        url.format({
          pathname: `/api/apm/services/opbeans-java/metadata/icons`,
          query: { start, end },
        })
      );

      expect(response.status).to.be(200);
      expect(response.body).to.eql({});
    });
  });

  registry.when(
    'Service icons when data is not loaded',
    { config: 'basic', archives: [archiveName] },
    () => {
      it('returns java service icons', async () => {
        const response = await supertest.get(
          url.format({
            pathname: `/api/apm/services/opbeans-java/metadata/icons`,
            query: { start, end },
          })
        );

        expect(response.status).to.be(200);

        expectSnapshot(response.body).toMatchInline(`
          Object {
            "agentName": "java",
            "cloudProvider": "gcp",
            "containerType": "Kubernetes",
          }
        `);
      });

      it('returns python service icons', async () => {
        const response = await supertest.get(
          url.format({
            pathname: `/api/apm/services/opbeans-python/metadata/icons`,
            query: { start, end },
          })
        );

        expect(response.status).to.be(200);

        expectSnapshot(response.body).toMatchInline(`
          Object {
            "agentName": "python",
            "cloudProvider": "gcp",
            "containerType": "Kubernetes",
          }
        `);
      });
    }
  );
}
