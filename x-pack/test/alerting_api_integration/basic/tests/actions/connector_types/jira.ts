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
export default function jiraTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');
  const mockJira = {
    config: {
      apiUrl: 'www.jiraisinkibanaactions.com',
    },
    secrets: {
      email: 'elastic',
      apiToken: 'changeme',
    },
    params: {
      incident: {
        summary: 'a title',
        description: 'a description',
        labels: ['kibana'],
        issueType: '10006',
        priority: 'High',
        externalId: null,
      },
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

    it('should return 403 when creating a jira connector', async () => {
      await supertest
        .post('/api/actions/connector')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'A jira connector',
          connector_type_id: '.jira',
          config: {
            apiUrl: jiraSimulatorURL,
            projectKey: 'CK',
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
