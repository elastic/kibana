/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getExternalServiceSimulatorPath,
  ExternalServiceSimulator,
} from '@kbn/actions-simulators-plugin/server/plugin';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function resilientTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');
  const mockResilient = {
    config: {
      apiUrl: 'www.resilientisinkibanaactions.com',
      orgId: '201',
    },
    secrets: {
      apiKeyId: 'elastic',
      apiKeySecret: 'changeme',
    },
    params: {
      incident: {
        name: 'a title',
        description: 'a description',
        incidentTypes: [1001],
        severityCode: 'High',
      },
      comments: [
        {
          commentId: '456',
          comment: 'first comment',
        },
      ],
    },
  };
  describe('resilient', () => {
    let resilientSimulatorURL: string = '<could not determine kibana url>';

    // need to wait for kibanaServer to settle ...
    before(() => {
      resilientSimulatorURL = kibanaServer.resolveUrl(
        getExternalServiceSimulatorPath(ExternalServiceSimulator.RESILIENT)
      );
    });

    it('should return 403 when creating a resilient connector', async () => {
      await supertest
        .post('/api/actions/connector')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'A resilient connector',
          connector_type_id: '.resilient',
          config: {
            ...mockResilient.config,
            apiUrl: resilientSimulatorURL,
          },
          secrets: mockResilient.secrets,
        })
        .expect(403, {
          statusCode: 403,
          error: 'Forbidden',
          message:
            'Action type .resilient is disabled because your basic license does not support it. Please upgrade your license.',
        });
    });
  });
}
