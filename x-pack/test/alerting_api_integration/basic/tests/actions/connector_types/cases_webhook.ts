/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ExternalServiceSimulator,
  getExternalServiceSimulatorPath,
} from '@kbn/actions-simulators-plugin/server/plugin';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function casesWebhookTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');

  const config = {
    createCommentJson: '{"body":{{{case.comment}}}}',
    createCommentMethod: 'post',
    createCommentUrl: 'https://coolsite.net/rest/api/2/issue/{{{external.system.id}}}/comment',
    createIncidentJson:
      '{"fields":{"summary":{{{case.title}}},"description":{{{case.description}}},"labels":{{{case.tags}}},"project":{"key":"ROC"},"issuetype":{"id":"10024"}}}',
    createIncidentMethod: 'post',
    createIncidentResponseKey: 'id',
    createIncidentUrl: 'https://coolsite.net/rest/api/2/issue',
    getIncidentResponseExternalTitleKey: 'key',
    hasAuth: true,
    headers: { ['content-type']: 'application/json' },
    viewIncidentUrl: 'https://coolsite.net/browse/{{{external.system.title}}}',
    getIncidentUrl: 'https://coolsite.net/rest/api/2/issue/{{{external.system.id}}}',
    updateIncidentJson:
      '{"fields":{"summary":{{{case.title}}},"description":{{{case.description}}},"labels":{{{case.tags}}},"project":{"key":"ROC"},"issuetype":{"id":"10024"}}}',
    updateIncidentMethod: 'put',
    updateIncidentUrl: 'https://coolsite.net/rest/api/2/issue/{{{external.system.id}}}',
  };

  const mockCasesWebhook = {
    config,
    secrets: {
      user: 'user',
      password: 'pass',
    },
    params: {
      incident: {
        summary: 'a title',
        description: 'a description',
        labels: ['kibana'],
      },
      comments: [
        {
          commentId: '456',
          comment: 'first comment',
        },
      ],
    },
  };
  describe('casesWebhook', () => {
    let casesWebhookSimulatorURL: string = '<could not determine kibana url>';
    before(() => {
      // use jira because cases webhook works with any third party case management system
      casesWebhookSimulatorURL = kibanaServer.resolveUrl(
        getExternalServiceSimulatorPath(ExternalServiceSimulator.JIRA)
      );
    });

    it('should return 403 when creating a cases webhook connector', async () => {
      await supertest
        .post('/api/actions/connector')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'A cases webhook connector',
          connector_type_id: '.cases-webhook',
          config: {
            ...config,
            createCommentUrl: `${casesWebhookSimulatorURL}/{{{external.system.id}}}/comments`,
            createIncidentUrl: casesWebhookSimulatorURL,
            viewIncidentUrl: `${casesWebhookSimulatorURL}/{{{external.system.title}}}`,
            getIncidentUrl: `${casesWebhookSimulatorURL}/{{{external.system.id}}}`,
            updateIncidentUrl: `${casesWebhookSimulatorURL}/{{{external.system.id}}}`,
          },
          secrets: mockCasesWebhook.secrets,
        })
        .expect(403, {
          statusCode: 403,
          error: 'Forbidden',
          message:
            'Action type .cases-webhook is disabled because your basic license does not support it. Please upgrade your license.',
        });
    });
  });
}
