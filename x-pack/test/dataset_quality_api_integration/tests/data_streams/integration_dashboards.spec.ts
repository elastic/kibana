/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { DatasetQualityApiClientKey } from '../../common/config';
import { FtrProviderContext } from '../../common/ftr_provider_context';

interface IntegrationPackage {
  name: string;
  version: string;
}

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const supertest = getService('supertest');
  const datasetQualityApiClient = getService('datasetQualityApiClient');

  const integrationPackages: IntegrationPackage[] = [
    {
      // with dashboards
      name: 'postgresql',
      version: '1.19.0',
    },
    {
      // without dashboards
      name: 'apm',
      version: '8.4.2',
    },
  ];

  async function installPackage({ name, version }: IntegrationPackage) {
    return supertest
      .post(`/api/fleet/epm/packages/${name}/${version}`)
      .set('kbn-xsrf', 'xxxx')
      .send({ force: true });
  }

  async function uninstallPackage({ name, version }: IntegrationPackage) {
    return supertest.delete(`/api/fleet/epm/packages/${name}/${version}`).set('kbn-xsrf', 'xxxx');
  }

  async function callApiAs(integration: string) {
    const user = 'datasetQualityLogsUser' as DatasetQualityApiClientKey;
    return await datasetQualityApiClient[user]({
      endpoint: 'GET /internal/dataset_quality/integrations/{integration}/dashboards',
      params: {
        path: {
          integration,
        },
      },
    });
  }

  registry.when('Integration dashboards', { config: 'basic' }, () => {
    describe('gets the installed integration dashboards', () => {
      before(async () => {
        await Promise.all(
          integrationPackages.map((pkg: IntegrationPackage) => installPackage(pkg))
        );
      });

      it('returns a non-empty body', async () => {
        const resp = await callApiAs(integrationPackages[0].name);
        expect(resp.body).not.empty();
      });

      it('returns a list of dashboards in the correct format', async () => {
        const expectedResult = {
          dashboards: [
            {
              id: 'postgresql-158be870-87f4-11e7-ad9c-db80de0bf8d3',
              title: '[Logs PostgreSQL] Overview',
            },
            {
              id: 'postgresql-4288b790-b79f-11e9-a579-f5c0a5d81340',
              title: '[Metrics PostgreSQL] Database Overview',
            },
            {
              id: 'postgresql-e4c5f230-87f3-11e7-ad9c-db80de0bf8d3',
              title: '[Logs PostgreSQL] Query Duration Overview',
            },
          ],
        };
        const resp = await callApiAs(integrationPackages[0].name);
        expect(resp.body).to.eql(expectedResult);
      });

      it('returns an empty array for an integration without dashboards', async () => {
        const expectedResult = {
          dashboards: [],
        };
        const resp = await callApiAs(integrationPackages[1].name);
        expect(resp.body).to.eql(expectedResult);
      });

      it('returns an empty array for an invalid integration', async () => {
        const expectedResult = {
          dashboards: [],
        };
        const resp = await callApiAs('invalid');
        expect(resp.body).to.eql(expectedResult);
      });

      after(
        async () =>
          await Promise.all(
            integrationPackages.map((pkg: IntegrationPackage) => uninstallPackage(pkg))
          )
      );
    });
  });
}
