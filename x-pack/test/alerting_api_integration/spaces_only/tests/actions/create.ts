/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { SpaceScenarios } from '../../scenarios';
import { getUrlPrefix, ObjectRemover } from '../../../common/lib';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function createActionTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('create', () => {
    const objectRemover = new ObjectRemover(supertest);

    after(() => objectRemover.removeAll());

    for (const scenario of SpaceScenarios) {
      describe(scenario.id, () => {
        it('should handle create action request appropriately', async () => {
          const response = await supertest
            .post(`${getUrlPrefix(scenario.id)}/api/action`)
            .set('kbn-xsrf', 'foo')
            .send({
              description: 'My action',
              actionTypeId: 'test.index-record',
              config: {
                unencrypted: `This value shouldn't get encrypted`,
              },
              secrets: {
                encrypted: 'This value should be encrypted',
              },
            });

          expect(response.statusCode).to.eql(200);
          expect(response.body).to.eql({
            id: response.body.id,
            description: 'My action',
            actionTypeId: 'test.index-record',
            config: {
              unencrypted: `This value shouldn't get encrypted`,
            },
          });
          expect(typeof response.body.id).to.be('string');
          objectRemover.add(scenario.id, response.body.id, 'action');
        });
      });
    }
  });
}
