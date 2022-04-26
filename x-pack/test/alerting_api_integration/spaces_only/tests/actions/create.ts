/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { Spaces } from '../../scenarios';
import { checkAAD, getUrlPrefix, ObjectRemover } from '../../../common/lib';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function createActionTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('create', () => {
    const objectRemover = new ObjectRemover(supertest);

    after(() => objectRemover.removeAll());

    it('should handle create connector request appropriately', async () => {
      const response = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/actions/connector`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'My action',
          connector_type_id: 'test.index-record',
          config: {
            unencrypted: `This value shouldn't get encrypted`,
          },
          secrets: {
            encrypted: 'This value should be encrypted',
          },
        });

      expect(response.status).to.eql(200);
      objectRemover.add(Spaces.space1.id, response.body.id, 'action', 'actions');
      expect(response.body).to.eql({
        id: response.body.id,
        is_preconfigured: false,
        is_deprecated: false,
        name: 'My action',
        connector_type_id: 'test.index-record',
        is_missing_secrets: false,
        config: {
          unencrypted: `This value shouldn't get encrypted`,
        },
      });
      expect(typeof response.body.id).to.be('string');

      // Ensure AAD isn't broken
      await checkAAD({
        supertest,
        spaceId: Spaces.space1.id,
        type: 'action',
        id: response.body.id,
      });
    });

    describe('legacy', () => {
      it('should handle create action request appropriately', async () => {
        const response = await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/api/actions/action`)
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'My action',
            actionTypeId: 'test.index-record',
            config: {
              unencrypted: `This value shouldn't get encrypted`,
            },
            secrets: {
              encrypted: 'This value should be encrypted',
            },
          });

        expect(response.status).to.eql(200);
        objectRemover.add(Spaces.space1.id, response.body.id, 'action', 'actions');
        expect(response.body).to.eql({
          id: response.body.id,
          isPreconfigured: false,
          isDeprecated: false,
          name: 'My action',
          actionTypeId: 'test.index-record',
          isMissingSecrets: false,
          config: {
            unencrypted: `This value shouldn't get encrypted`,
          },
        });
        expect(typeof response.body.id).to.be('string');

        // Ensure AAD isn't broken
        await checkAAD({
          supertest,
          spaceId: Spaces.space1.id,
          type: 'action',
          id: response.body.id,
        });
      });
    });

    it('should notify feature usage when creating a gold action type', async () => {
      const testStart = new Date();
      const response = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/actions/action`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'Noop action type',
          actionTypeId: 'test.noop',
          secrets: {},
          config: {},
        })
        .expect(200);
      objectRemover.add(Spaces.space1.id, response.body.id, 'action', 'actions');

      const {
        body: { features },
      } = await supertest.get(`${getUrlPrefix(Spaces.space1.id)}/api/licensing/feature_usage`);
      expect(features).to.be.an(Array);
      const noopFeature = features.find(
        (feature: { name: string }) => feature.name === 'Connector: Test: Noop'
      );
      expect(noopFeature).to.be.ok();
      expect(noopFeature.last_used).to.be.a('string');
      expect(new Date(noopFeature.last_used).getTime()).to.be.greaterThan(testStart.getTime());
    });
  });
}
