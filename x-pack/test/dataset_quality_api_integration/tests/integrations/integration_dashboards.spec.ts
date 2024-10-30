/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { DatasetQualityApiClientKey } from '../../common/config';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { installPackage, uninstallPackage } from './package_utils';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const supertest = getService('supertest');
  const datasetQualityApiClient = getService('datasetQualityApiClient');

  const integrationPackages = ['nginx', 'apm'];

  async function callApiAs(integration: string) {
    const user = 'datasetQualityMonitorUser' as DatasetQualityApiClientKey;
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
        await Promise.all(integrationPackages.map((pkg) => installPackage({ supertest, pkg })));
      });

      it('returns a non-empty body', async () => {
        const resp = await callApiAs(integrationPackages[0]);
        expect(resp.body).not.empty();
      });

      it('returns a list of dashboards in the correct format', async () => {
        const expectedResult = {
          dashboards: [
            {
              id: 'nginx-023d2930-f1a5-11e7-a9ef-93c69af7b129',
              title: '[Metrics Nginx] Overview',
            },
            {
              id: 'nginx-046212a0-a2a1-11e7-928f-5dbe6f6f5519',
              title: '[Logs Nginx] Access and error logs',
            },
            {
              id: 'nginx-55a9e6e0-a29e-11e7-928f-5dbe6f6f5519',
              title: '[Logs Nginx] Overview',
            },
          ],
        };
        const resp = await callApiAs(integrationPackages[0]);
        expect(resp.body).to.eql(expectedResult);
      });

      it('returns an empty array for an integration without dashboards', async () => {
        const expectedResult = {
          dashboards: [],
        };
        const resp = await callApiAs(integrationPackages[1]);
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
          await Promise.all(integrationPackages.map((pkg) => uninstallPackage({ supertest, pkg })))
      );
    });
  });
}
