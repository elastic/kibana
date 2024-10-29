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
export default function servicenowTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');
  const mockServiceNow = {
    config: {
      apiUrl: 'www.servicenowisinkibanaactions.com',
    },
    secrets: {
      password: 'elastic',
      username: 'changeme',
    },
    params: {
      incident: {
        short_description: 'a title',
        description: 'a description',
        severity: '1',
        urgency: '2',
        impact: '1',
      },
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

    it('should return 403 when creating a servicenow connector', async () => {
      await supertest
        .post('/api/actions/connector')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'A servicenow connector',
          connector_type_id: '.servicenow',
          config: {
            apiUrl: servicenowSimulatorURL,
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
