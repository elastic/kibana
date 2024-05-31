/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';
import { setupFleetAndAgents } from '../agents/services';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;

  const supertest = getService('supertest');

  const testPkgs = [
    {
      name: 'apache',
      version: '0.1.4',
    },
    {
      name: 'nginx',
      version: '1.2.1',
    },
  ];

  const uninstallPackage = async (name: string, version: string) => {
    await supertest.delete(`/api/fleet/epm/packages/${name}/${version}`).set('kbn-xsrf', 'xxxx');
  };

  const installPackage = async (name: string, version: string) => {
    await supertest
      .post(`/api/fleet/epm/packages/${name}/${version}`)
      .set('kbn-xsrf', 'xxxx')
      .send({ force: true });
  };

  const listDataViews = async () => {
    const response = await supertest.get('/api/data_views');

    return response.body.data_view;
  };

  describe('EPM - data views', () => {
    skipIfNoDockerRegistry(providerContext);
    setupFleetAndAgents(providerContext);

    afterEach(async () => {
      await Promise.all(testPkgs.map((pkg) => uninstallPackage(pkg.name, pkg.version)));
    });

    describe('with single integration installation', async () => {
      it('creates global data views for logs-* and metrics-*', async () => {
        await installPackage(testPkgs[0].name, testPkgs[0].version);
        const dataViews: any[] = await listDataViews();

        expect(dataViews).to.have.length(2);
        const logsDataView = dataViews.find(({ title }) => title === 'logs-*');
        const metricsDataView = dataViews.find(({ title }) => title === 'metrics-*');

        expect(logsDataView).to.be.ok();
        expect(metricsDataView).to.be.ok();

        // Each data view should be available in all spaces
        expect(logsDataView.namespaces).to.contain('*');
        expect(metricsDataView.namespaces).to.contain('*');
      });
    });

    describe('with subsequent integration installation', async () => {
      it('does not recreate managed data views', async () => {
        await installPackage(testPkgs[0].name, testPkgs[0].version);
        const initialDataViews: any[] = await listDataViews();
        const initialLogsDataView = initialDataViews.find(({ title }) => title === 'logs-*');
        const initialMetricsDataView = initialDataViews.find(({ title }) => title === 'metrics-*');

        expect(initialLogsDataView).to.be.ok();
        expect(initialMetricsDataView).to.be.ok();

        await installPackage(testPkgs[1].name, testPkgs[1].version);
        const subsequentDataViews: any[] = await listDataViews();
        const subsequentLogsDataView = subsequentDataViews.find(({ title }) => title === 'logs-*');
        const subsequentMetricsDataView = subsequentDataViews.find(
          ({ title }) => title === 'metrics-*'
        );

        // ID's should not have changed as the data views should not have been recreated
        expect(initialLogsDataView.id).to.eql(subsequentLogsDataView.id);
        expect(initialMetricsDataView.id).to.eql(subsequentMetricsDataView.id);
      });
    });
  });
}
