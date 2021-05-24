/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { JsonObject } from 'src/plugins/kibana_utils/common';
import { FtrProviderContext } from '../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function rulesApiTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  function request({ method, url, data }: { method: string; url: string; data?: JsonObject }) {
    switch (method.toLowerCase()) {
      case 'post':
        return supertest.post(url).send(data).set('kbn-xsrf', 'foo');

      default:
        throw new Error(`Unsupported methoed ${method}`);
    }
  }

  describe('Observability rules with a basic license', () => {
    describe('when listing top alerts', () => {
      it('completes with a 200', async () => {
        const response = await supertest
          .get('/api/observability/rules/alerts/top')
          .query({ status: 'all' });

        expect(response.status).to.be(200);
      });
    });
  });
}
