/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../../../common/ftr_provider_context';

import {
  getExternalServiceSimulatorPath,
  ExternalServiceSimulator,
} from '../../../../common/fixtures/plugins/actions_simulators/server/plugin';

const mapping = [
  {
    source: 'title',
    target: 'description',
    actionType: 'nothing',
  },
  {
    source: 'description',
    target: 'short_description',
    actionType: 'nothing',
  },
  {
    source: 'comments',
    target: 'comments',
    actionType: 'nothing',
  },
];

// eslint-disable-next-line import/no-default-export
export default function resilientTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');
  const mockResilient = {
    config: {
      apiUrl: 'www.resilientisinkibanaactions.com',
      orgId: '201',
      incidentConfiguration: { mapping: [...mapping] },
      isCaseOwned: true,
    },
    secrets: {
      apiKeyId: 'elastic',
      apiKeySecret: 'changeme',
    },
    params: {
      savedObjectId: '123',
      title: 'a title',
      description: 'a description',
      incidentTypes: [1001],
      severityCode: 'High',
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

    it('should return 403 when creating a resilient action', async () => {
      await supertest
        .post('/api/actions/action')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'A resilient action',
          actionTypeId: '.resilient',
          config: {
            apiUrl: resilientSimulatorURL,
            incidentConfiguration: { ...mockResilient.config.incidentConfiguration },
            isCaseOwned: true,
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
