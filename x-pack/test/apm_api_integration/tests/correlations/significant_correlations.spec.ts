/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../common/ftr_provider_context';

export default function ApiTest({ getService }: FtrProviderContext) {
  const apmApiClient = getService('apmApiClient');
  const registry = getService('registry');

  const endpoint = 'POST /internal/apm/correlations/significant_correlations';

  const getOptions = () => ({
    params: {
      body: {
        environment: 'ENVIRONMENT_ALL',
        start: '2020',
        end: '2021',
        kuery: '',
        fieldValuePairs: [
          { fieldName: 'service.version', fieldValue: '2020-08-26 02:09:20' },
          { fieldName: 'service.version', fieldValue: 'None' },
          {
            fieldName: 'service.node.name',
            fieldValue: 'af586da824b28435f3a8c8f0c016096502cd2495d64fb332db23312be88cfff6',
          },
          {
            fieldName: 'service.node.name',
            fieldValue: 'asdf',
          },
          { fieldName: 'service.runtime.version', fieldValue: '12.18.3' },
          { fieldName: 'service.runtime.version', fieldValue: '2.6.6' },
          {
            fieldName: 'kubernetes.pod.name',
            fieldValue: 'opbeans-node-6cf6cf6f58-r5q9l',
          },
          {
            fieldName: 'kubernetes.pod.name',
            fieldValue: 'opbeans-java-6dc7465984-h9sh5',
          },
          {
            fieldName: 'kubernetes.pod.uid',
            fieldValue: '8da9c944-e741-11ea-819e-42010a84004a',
          },
          {
            fieldName: 'kubernetes.pod.uid',
            fieldValue: '8e192c6c-e741-11ea-819e-42010a84004a',
          },
          {
            fieldName: 'container.id',
            fieldValue: 'af586da824b28435f3a8c8f0c016096502cd2495d64fb332db23312be88cfff6',
          },
          {
            fieldName: 'container.id',
            fieldValue: 'asdf',
          },
          { fieldName: 'host.ip', fieldValue: '10.52.6.48' },
          { fieldName: 'host.ip', fieldValue: '10.52.6.50' },
        ],
      },
    },
  });

  registry.when('significant correlations without data', { config: 'trial', archives: [] }, () => {
    it('handles the empty state', async () => {
      const response = await apmApiClient.readUser({
        endpoint,
        ...getOptions(),
      });

      expect(response.status).to.be(200);
      expect(response.body?.latencyCorrelations.length).to.be(0);
    });
  });

  registry.when(
    'significant correlations with data and default args',
    { config: 'trial', archives: ['8.0.0'] },
    () => {
      it('returns significant correlations', async () => {
        const response = await apmApiClient.readUser({
          endpoint,
          ...getOptions(),
        });

        expect(response.status).to.eql(200);
        expect(response.body?.latencyCorrelations.length).to.be(7);
      });
    }
  );
}
