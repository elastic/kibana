/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import url from 'url';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import archives from '../../../common/fixtures/es_archiver/archives_metadata';

export default function ApiTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  const archiveName = 'apm_8.0.0';
  const { start, end } = archives[archiveName];

  describe('Service icons', () => {
    describe('when data is not loaded ', () => {
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

    describe('when data is loaded', () => {
      before(() => esArchiver.load(archiveName));
      after(() => esArchiver.unload(archiveName));

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
    });
  });
}
