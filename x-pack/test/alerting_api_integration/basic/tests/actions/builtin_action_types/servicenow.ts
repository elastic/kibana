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

// node ../scripts/functional_test_runner.js --grep "Actions.servicenddd" --config=test/alerting_api_integration/security_and_spaces/config.ts

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
export default function servicenowTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');
  const mockServiceNow = {
    config: {
      apiUrl: 'www.servicenowisinkibanaactions.com',
      incidentConfiguration: { mapping: [...mapping] },
      isCaseOwned: true,
    },
    secrets: {
      password: 'elastic',
      username: 'changeme',
    },
    params: {
      savedObjectId: '123',
      title: 'a title',
      description: 'a description',
      comment: 'test-alert comment',
      severity: '1',
      urgency: '2',
      impact: '1',
      comments: [
        {
          commentId: '456',
          comment: 'first comment',
        },
      ],
    },
  };
  describe('servicenow', () => {
    let servicenowSimulatorURL: string = '<could not determine kibana url>';

    // need to wait for kibanaServer to settle ...
    before(() => {
      servicenowSimulatorURL = kibanaServer.resolveUrl(
        getExternalServiceSimulatorPath(ExternalServiceSimulator.SERVICENOW)
      );
    });

    it('should return 403 when creating a servicenow action', async () => {
      await supertest
        .post('/api/actions/action')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'A servicenow action',
          actionTypeId: '.servicenow',
          config: {
            apiUrl: servicenowSimulatorURL,
            incidentConfiguration: { ...mockServiceNow.config.incidentConfiguration },
            isCaseOwned: true,
          },
          secrets: mockServiceNow.secrets,
        })
        .expect(403, {
          statusCode: 403,
          error: 'Forbidden',
          message:
            'Action type .servicenow is disabled because your basic license does not support it. Please upgrade your license.',
        });
    });
  });
}
