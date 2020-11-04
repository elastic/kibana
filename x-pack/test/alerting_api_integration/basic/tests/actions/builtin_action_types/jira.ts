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
    target: 'summary',
    actionType: 'nothing',
  },
  {
    source: 'description',
    target: 'description',
    actionType: 'nothing',
  },
  {
    source: 'comments',
    target: 'comments',
    actionType: 'nothing',
  },
];

// eslint-disable-next-line import/no-default-export
export default function jiraTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');
  const mockJira = {
    config: {
      apiUrl: 'www.jiraisinkibanaactions.com',
      incidentConfiguration: { mapping: [...mapping] },
      isCaseOwned: true,
    },
    secrets: {
      email: 'elastic',
      apiToken: 'changeme',
    },
    params: {
      savedObjectId: '123',
      title: 'a title',
      description: 'a description',
      labels: ['kibana'],
      issueType: '10006',
      priority: 'High',
      externalId: null,
      comments: [
        {
          commentId: '456',
          comment: 'first comment',
        },
      ],
    },
  };
  describe('jira', () => {
    let jiraSimulatorURL: string = '<could not determine kibana url>';

    // need to wait for kibanaServer to settle ...
    before(() => {
      jiraSimulatorURL = kibanaServer.resolveUrl(
        getExternalServiceSimulatorPath(ExternalServiceSimulator.JIRA)
      );
    });

    it('should return 403 when creating a jira action', async () => {
      await supertest
        .post('/api/actions/action')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'A jira action',
          actionTypeId: '.jira',
          config: {
            apiUrl: jiraSimulatorURL,
            projectKey: 'CK',
            incidentConfiguration: { ...mockJira.config.incidentConfiguration },
            isCaseOwned: true,
          },
          secrets: mockJira.secrets,
        })
        .expect(403, {
          statusCode: 403,
          error: 'Forbidden',
          message:
            'Action type .jira is disabled because your basic license does not support it. Please upgrade your license.',
        });
    });
  });
}
