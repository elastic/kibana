/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import {
  ExternalServiceSimulator,
  getExternalServiceSimulatorPath,
} from '../../../../common/fixtures/plugins/actions_simulators/server/plugin';

// eslint-disable-next-line import/no-default-export
export default function swimlaneTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');
  const mockSwimlane = {
    name: 'A swimlane action',
    actionTypeId: '.swimlane',
    config: {
      apiUrl: 'http://swimlane.mynonexistent.co',
      appId: '123456asdf',
      connectorType: 'all',
      mappings: {
        severityConfig: {
          id: 'adnlas',
          name: 'Severity',
          key: 'severity',
          fieldType: 'text',
        },
        ruleNameConfig: {
          id: 'adnfls',
          name: 'Rule Name',
          key: 'rule-name',
          fieldType: 'text',
        },
        caseIdConfig: {
          id: 'a6sst',
          name: 'Case Id',
          key: 'case-id-name',
          fieldType: 'text',
        },
        caseNameConfig: {
          id: 'a6fst',
          name: 'Case Name',
          key: 'case-name',
          fieldType: 'text',
        },
        commentsConfig: {
          id: 'a6fdf',
          name: 'Comments',
          key: 'comments',
          fieldType: 'text',
        },
      },
    },
    secrets: {
      apiToken: 'swimlane-api-key',
    },
  };

  describe('swimlane', () => {
    let swimlaneSimulatorURL: string = '<could not determine kibana url>';

    // need to wait for kibanaServer to settle ...
    before(() => {
      swimlaneSimulatorURL = kibanaServer.resolveUrl(
        getExternalServiceSimulatorPath(ExternalServiceSimulator.SWIMLANE)
      );
    });
    it('should return 403 when creating a swimlane action', async () => {
      await supertest
        .post('/api/actions/action')
        .set('kbn-xsrf', 'foo')
        .send({
          ...mockSwimlane,
          config: {
            ...mockSwimlane.config,
            apiUrl: swimlaneSimulatorURL,
          },
        })
        .expect(403, {
          statusCode: 403,
          error: 'Forbidden',
          message:
            'Action type .swimlane is disabled because your basic license does not support it. Please upgrade your license.',
        });
    });
  });
}
