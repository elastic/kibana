/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { DatasetQualityApiClientKey } from '../../common/config';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  CustomIntegration,
  installCustomIntegration,
  installPackage,
  IntegrationPackage,
  uninstallPackage,
} from './package_utils';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const supertest = getService('supertest');
  const datasetQualityApiClient = getService('datasetQualityApiClient');

  const integrationPackages: IntegrationPackage[] = [
    {
      // logs based integration
      name: 'system',
      version: '1.0.0',
    },
    {
      // logs based integration
      name: 'apm',
      version: '8.0.0',
    },
    {
      // non-logs based integration
      name: 'synthetics',
      version: '1.0.0',
    },
  ];

  const customIntegrations: CustomIntegration[] = [
    {
      integrationName: 'my.custom.integration',
      datasets: [
        {
          name: 'my.custom.integration',
          type: 'logs',
        },
      ],
    },
  ];

  async function callApiAs() {
    const user = 'datasetQualityLogsUser' as DatasetQualityApiClientKey;

    return await datasetQualityApiClient[user]({
      endpoint: 'GET /internal/dataset_quality/integrations',
      params: {
        query: {
          type: 'logs',
        },
      },
    });
  }

  registry.when('Integration', { config: 'basic' }, () => {
    describe('gets the installed integrations', () => {
      before(async () => {
        await Promise.all(
          integrationPackages.map((pkg: IntegrationPackage) => installPackage({ supertest, pkg }))
        );
      });

      it('returns only log based integrations and its datasets map', async () => {
        const resp = await callApiAs();

        expect(resp.body.integrations.map((integration) => integration.name)).to.eql([
          'apm',
          'system',
        ]);

        expect(resp.body.integrations[0].datasets).not.empty();
        expect(resp.body.integrations[1].datasets).not.empty();
      });

      after(
        async () =>
          await Promise.all(
            integrationPackages.map((pkg: IntegrationPackage) =>
              uninstallPackage({ supertest, pkg })
            )
          )
      );
    });

    describe('gets the custom installed integrations', () => {
      before(async () => {
        await Promise.all(
          customIntegrations.map((customIntegration: CustomIntegration) =>
            installCustomIntegration({ supertest, customIntegration })
          )
        );
      });

      it('returns custom integrations and its datasets map', async () => {
        const resp = await callApiAs();

        expect(resp.body.integrations.map((integration) => integration.name)).to.eql([
          'my.custom.integration',
        ]);

        expect(resp.body.integrations[0].datasets).to.eql({
          'my.custom.integration': 'My.custom.integration',
        });
      });

      after(
        async () =>
          await Promise.all(
            customIntegrations.map((customIntegration: CustomIntegration) =>
              uninstallPackage({
                supertest,
                pkg: { name: customIntegration.integrationName, version: '1.0.0' },
              })
            )
          )
      );
    });
  });
}
