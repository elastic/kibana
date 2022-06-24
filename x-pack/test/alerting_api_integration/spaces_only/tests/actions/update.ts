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
export default function updateActionTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('update', () => {
    const objectRemover = new ObjectRemover(supertest);

    after(() => objectRemover.removeAll());

    it('should handle update action request appropriately', async () => {
      const { body: createdAction } = await supertest
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
        })
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdAction.id, 'action', 'actions');

      await supertest
        .put(`${getUrlPrefix(Spaces.space1.id)}/api/actions/connector/${createdAction.id}`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'My action updated',
          config: {
            unencrypted: `This value shouldn't get encrypted`,
          },
          secrets: {
            encrypted: 'This value should be encrypted',
          },
        })
        .expect(200, {
          id: createdAction.id,
          is_preconfigured: false,
          is_deprecated: false,
          connector_type_id: 'test.index-record',
          is_missing_secrets: false,
          name: 'My action updated',
          config: {
            unencrypted: `This value shouldn't get encrypted`,
          },
        });

      // Ensure AAD isn't broken
      await checkAAD({
        supertest,
        spaceId: Spaces.space1.id,
        type: 'action',
        id: createdAction.id,
      });
    });

    it(`shouldn't update action from another space`, async () => {
      const { body: createdAction } = await supertest
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
        })
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdAction.id, 'action', 'actions');

      await supertest
        .put(`${getUrlPrefix(Spaces.other.id)}/api/actions/action/${createdAction.id}`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'My action updated',
          config: {
            unencrypted: `This value shouldn't get encrypted`,
          },
          secrets: {
            encrypted: 'This value should be encrypted',
          },
        })
        .expect(404, {
          statusCode: 404,
          error: 'Not Found',
          message: `Saved object [action/${createdAction.id}] not found`,
        });
    });

    it(`shouldn't update action from preconfigured list`, async () => {
      await supertest
        .put(`${getUrlPrefix(Spaces.space1.id)}/api/actions/connector/custom-system-abc-connector`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'My action updated',
          config: {
            unencrypted: `This value shouldn't get encrypted`,
          },
          secrets: {
            encrypted: 'This value should be encrypted',
          },
        })
        .expect(400, {
          statusCode: 400,
          error: 'Bad Request',
          message: `Preconfigured action custom-system-abc-connector is not allowed to update.`,
        });
    });

    it('should notify feature usage when editing a gold action type', async () => {
      const { body: createdAction } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/actions/connector`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'Noop action type',
          connector_type_id: 'test.noop',
          secrets: {},
          config: {},
        })
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdAction.id, 'action', 'actions');

      const updateStart = new Date();
      await supertest
        .put(`${getUrlPrefix(Spaces.space1.id)}/api/actions/connector/${createdAction.id}`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'Noop action type updated',
          secrets: {},
          config: {},
        })
        .expect(200);

      const {
        body: { features },
      } = await supertest.get(`${getUrlPrefix(Spaces.space1.id)}/api/licensing/feature_usage`);
      expect(features).to.be.an(Array);
      const noopFeature = features.find(
        (feature: { name: string }) => feature.name === 'Connector: Test: Noop'
      );
      expect(noopFeature).to.be.ok();
      expect(noopFeature.last_used).to.be.a('string');
      expect(new Date(noopFeature.last_used).getTime()).to.be.greaterThan(updateStart.getTime());
    });

    describe('legacy', () => {
      it('should handle update action request appropriately', async () => {
        const { body: createdAction } = await supertest
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
          })
          .expect(200);
        objectRemover.add(Spaces.space1.id, createdAction.id, 'action', 'actions');

        await supertest
          .put(`${getUrlPrefix(Spaces.space1.id)}/api/actions/action/${createdAction.id}`)
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'My action updated',
            config: {
              unencrypted: `This value shouldn't get encrypted`,
            },
            secrets: {
              encrypted: 'This value should be encrypted',
            },
          })
          .expect(200, {
            id: createdAction.id,
            isPreconfigured: false,
            isDeprecated: false,
            actionTypeId: 'test.index-record',
            isMissingSecrets: false,
            name: 'My action updated',
            config: {
              unencrypted: `This value shouldn't get encrypted`,
            },
          });

        // Ensure AAD isn't broken
        await checkAAD({
          supertest,
          spaceId: Spaces.space1.id,
          type: 'action',
          id: createdAction.id,
        });
      });

      it(`shouldn't update action from another space`, async () => {
        const { body: createdAction } = await supertest
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
          })
          .expect(200);
        objectRemover.add(Spaces.space1.id, createdAction.id, 'action', 'actions');

        await supertest
          .put(`${getUrlPrefix(Spaces.other.id)}/api/actions/action/${createdAction.id}`)
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'My action updated',
            config: {
              unencrypted: `This value shouldn't get encrypted`,
            },
            secrets: {
              encrypted: 'This value should be encrypted',
            },
          })
          .expect(404, {
            statusCode: 404,
            error: 'Not Found',
            message: `Saved object [action/${createdAction.id}] not found`,
          });
      });

      it(`shouldn't update action from preconfigured list`, async () => {
        await supertest
          .put(`${getUrlPrefix(Spaces.space1.id)}/api/actions/action/custom-system-abc-connector`)
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'My action updated',
            config: {
              unencrypted: `This value shouldn't get encrypted`,
            },
            secrets: {
              encrypted: 'This value should be encrypted',
            },
          })
          .expect(400, {
            statusCode: 400,
            error: 'Bad Request',
            message: `Preconfigured action custom-system-abc-connector is not allowed to update.`,
          });
      });

      it('should notify feature usage when editing a gold action type', async () => {
        const { body: createdAction } = await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/api/actions/action`)
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'Noop action type',
            actionTypeId: 'test.noop',
            secrets: {},
            config: {},
          })
          .expect(200);
        objectRemover.add(Spaces.space1.id, createdAction.id, 'action', 'actions');

        const updateStart = new Date();
        await supertest
          .put(`${getUrlPrefix(Spaces.space1.id)}/api/actions/action/${createdAction.id}`)
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'Noop action type updated',
            secrets: {},
            config: {},
          })
          .expect(200);

        const {
          body: { features },
        } = await supertest.get(`${getUrlPrefix(Spaces.space1.id)}/api/licensing/feature_usage`);
        expect(features).to.be.an(Array);
        const noopFeature = features.find(
          (feature: { name: string }) => feature.name === 'Connector: Test: Noop'
        );
        expect(noopFeature).to.be.ok();
        expect(noopFeature.last_used).to.be.a('string');
        expect(new Date(noopFeature.last_used).getTime()).to.be.greaterThan(updateStart.getTime());
      });
    });
  });
}
