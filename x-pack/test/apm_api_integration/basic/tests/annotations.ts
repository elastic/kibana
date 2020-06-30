/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { JsonObject } from 'src/plugins/kibana_utils/common';
import { FtrProviderContext } from '../../common/ftr_provider_context';

export default function annotationApiTests({ getService }: FtrProviderContext) {
  const supertestWrite = getService('supertestAsApmAnnotationsWriteUser');

  function request({ method, url, data }: { method: string; url: string; data?: JsonObject }) {
    switch (method.toLowerCase()) {
      case 'post':
        return supertestWrite.post(url).send(data).set('kbn-xsrf', 'foo');

      default:
        throw new Error(`Unsupported method ${method}`);
    }
  }

  describe('APM annotations with a basic license', () => {
    describe('when creating an annotation', () => {
      it('fails with a 403 forbidden', async () => {
        const response = await request({
          url: '/api/apm/services/opbeans-java/annotation',
          method: 'POST',
          data: {
            '@timestamp': new Date().toISOString(),
            message: 'New deployment',
            tags: ['foo'],
            service: {
              version: '1.1',
              environment: 'production',
            },
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
