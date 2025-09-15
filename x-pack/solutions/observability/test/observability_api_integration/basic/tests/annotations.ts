/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { JsonObject } from '@kbn/utility-types';
import { FtrProviderContext } from '../../common/ftr_provider_context';

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
