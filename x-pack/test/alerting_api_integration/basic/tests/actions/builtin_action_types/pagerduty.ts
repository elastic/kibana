/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../../../common/ftr_provider_context';

import {
  getExternalServiceSimulatorPath,
  ExternalServiceSimulator,
} from '../../../../common/fixtures/plugins/actions';

// eslint-disable-next-line import/no-default-export
export default function pagerdutyTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');

  describe('pagerduty action', () => {
    let pagerdutySimulatorURL: string = '<could not determine kibana url>';

    // need to wait for kibanaServer to settle ...
    before(() => {
      pagerdutySimulatorURL = kibanaServer.resolveUrl(
        getExternalServiceSimulatorPath(ExternalServiceSimulator.PAGERDUTY)
      );
    });

    it('should return 403 when creating a pagerduty action', async () => {
      await supertest
        .post('/api/action')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'A pagerduty action',
          actionTypeId: '.pagerduty',
          config: {
            apiUrl: pagerdutySimulatorURL,
          },
          secrets: {
            routingKey: 'pager-duty-routing-key',
          },
        })
        .expect(403, {
          statusCode: 403,
          error: 'Forbidden',
          message:
            'Action type .pagerduty is disabled because your basic license does not support it. Please upgrade your license.',
        });
    });
  });
}
