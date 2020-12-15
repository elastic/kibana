/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import archives from '../../../common/archives_metadata';

export default function ApiTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  const archiveName = 'apm_8.0.0';
  const range = archives[archiveName];
  const start = encodeURIComponent(range.start);
  const end = encodeURIComponent(range.end);

  describe('Service details', () => {
    describe('when data is not loaded ', () => {
      it('handles the empty state', async () => {
        const response = await supertest.get(
          `/api/apm/services/opbeans-java/metadata/details?start=${start}&end=${end}&uiFilters=%7B%7`
        );

        expect(response.status).to.be(200);
        expect(response.body).to.eql({});
      });
    });

    describe('when data is loaded', () => {
      before(() => esArchiver.load(archiveName));
      after(() => esArchiver.unload(archiveName));

      it('returns java service details', async () => {
        const response = await supertest.get(
          `/api/apm/services/opbeans-java/metadata/details?start=${start}&end=${end}&uiFilters=%7B%7`
        );

        expect(response.status).to.be(200);

        expectSnapshot(response.body).toMatchInline(`
          Object {
            "container": Object {
              "isContainerized": true,
              "orchestration": "Kubernetes",
              "os": "Linux",
              "totalNumberInstances": 1,
            },
            "service": Object {
              "agent": Object {
                "ephemeral_id": "d27b2271-06b4-48c8-a02a-cfd963c0b4d0",
                "name": "java",
                "version": "1.19.1-SNAPSHOT.null",
              },
              "framework": "Servlet API",
              "runtime": Object {
                "name": "Java",
                "version": "11.0.9.1",
              },
              "versions": Array [
                "2020-12-08 03:35:36",
              ],
            },
          }
        `);
      });

      it('returns python service details', async () => {
        const response = await supertest.get(
          `/api/apm/services/opbeans-python/metadata/details?start=${start}&end=${end}&uiFilters=%7B%7`
        );

        expect(response.status).to.be(200);

        expectSnapshot(response.body).toMatchInline(`
          Object {
            "cloud": Object {
              "availabilityZones": Array [
                "europe-west1-c",
              ],
              "machineTypes": Array [
                "n1-standard-4",
              ],
              "projectName": "elastic-observability",
              "provider": "gcp",
            },
            "container": Object {
              "isContainerized": true,
              "orchestration": "Kubernetes",
              "os": "linux",
              "totalNumberInstances": 1,
            },
            "service": Object {
              "agent": Object {
                "name": "python",
                "version": "5.10.0",
              },
              "framework": "django",
              "runtime": Object {
                "name": "CPython",
                "version": "3.8.6",
              },
              "versions": Array [
                "2020-12-08 03:35:35",
              ],
            },
          }
        `);
      });
    });
  });
}
