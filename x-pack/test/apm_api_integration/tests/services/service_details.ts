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

  registry.when(
    'Service details when data is not loaded',
    { config: 'basic', archives: [] },
    () => {
      it('handles the empty state', async () => {
        const response = await supertest.get(
          url.format({
            pathname: `/api/apm/services/opbeans-java/metadata/details`,
            query: { start, end },
          })
        );

        expect(response.status).to.be(200);
        expect(response.body).to.eql({});
      });
    }
  );

  registry.when(
    'Service details when data is loaded',
    { config: 'basic', archives: [archiveName] },
    () => {
      it('returns java service details', async () => {
        const response = await supertest.get(
          url.format({
            pathname: `/api/apm/services/opbeans-java/metadata/details`,
            query: { start, end },
          })
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
              "os": "Linux",
              "totalNumberInstances": 1,
              "type": "Kubernetes",
            },
            "service": Object {
              "agent": Object {
                "ephemeral_id": "2745d454-f57f-4473-a09b-fe6bef295860",
                "name": "java",
                "version": "1.25.1-SNAPSHOT.UNKNOWN",
              },
              "runtime": Object {
                "name": "Java",
                "version": "11.0.11",
              },
              "versions": Array [
                "2021-08-03 04:26:27",
              ],
            },
          }
        `);
      });

      it('returns python service details', async () => {
        const response = await supertest.get(
          url.format({
            pathname: `/api/apm/services/opbeans-python/metadata/details`,
            query: { start, end },
          })
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
              "os": "linux",
              "totalNumberInstances": 1,
              "type": "Kubernetes",
            },
            "service": Object {
              "agent": Object {
                "name": "python",
                "version": "6.3.3",
              },
              "framework": "django",
              "runtime": Object {
                "name": "CPython",
                "version": "3.9.6",
              },
              "versions": Array [
                "2021-08-03 04:26:25",
              ],
            },
          }
        `);
      });
    }
  );
}
