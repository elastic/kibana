/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { JsonObject } from 'src/plugins/kibana_utils/common';
import { FtrProviderContext } from '../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function annotationApiTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  function request({ method, url, data }: { method: string; url: string; data?: JsonObject }) {
    switch (method.toLowerCase()) {
      case 'post':
        return supertest.post(url).send(data).set('kbn-xsrf', 'foo');

      default:
        throw new Error(`Unsupported methoed ${method}`);
    }
  }

  describe('Observability annotations with a basic license', () => {
    describe('when creating an annotation', () => {
      it('fails with a 403 forbidden', async () => {
        const response = await request({
          url: '/api/observability/annotation',
          method: 'POST',
          data: {
            annotation: {
              type: 'deployment',
            },
            '@timestamp': new Date().toISOString(),
            message: 'test message',
            tags: ['apm'],
          },
        });

        expect(response.status).to.be(403);
        expect(response.body.message).to.be(
          'Annotations require at least a gold license or a trial license.'
        );
      });
    });
  });
}
