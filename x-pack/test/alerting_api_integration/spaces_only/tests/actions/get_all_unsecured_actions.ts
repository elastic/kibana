/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { getUrlPrefix, ObjectRemover } from '../../../common/lib';
import { Spaces } from '../../scenarios';

// eslint-disable-next-line import/no-default-export
export default function createUnsecuredActionTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');

  const preconfiguredConnectors = [
    {
      id: 'preconfigured-alert-history-es-index',
      actionTypeId: '.index',
      name: 'Alert history Elasticsearch index',
      isPreconfigured: true,
      isDeprecated: false,
      isSystemAction: false,
      referencedByCount: 0,
    },
    {
      id: 'notification-email',
      actionTypeId: '.email',
      name: 'Notification Email Connector',
      isPreconfigured: true,
      isDeprecated: false,
      isSystemAction: false,
      referencedByCount: 0,
    },
    {
      id: 'preconfigured-es-index-action',
      actionTypeId: '.index',
      name: 'preconfigured_es_index_action',
      isPreconfigured: true,
      isDeprecated: false,
      isSystemAction: false,
      referencedByCount: 0,
    },
    {
      id: 'my-deprecated-servicenow',
      actionTypeId: '.servicenow',
      name: 'ServiceNow#xyz',
      isPreconfigured: true,
      isDeprecated: true,
      isSystemAction: false,
      referencedByCount: 0,
    },
    {
      id: 'my-deprecated-servicenow-default',
      actionTypeId: '.servicenow',
      name: 'ServiceNow#xyz',
      isPreconfigured: true,
      isDeprecated: true,
      isSystemAction: false,
      referencedByCount: 0,
    },
    {
      id: 'my-slack1',
      actionTypeId: '.slack',
      name: 'Slack#xyz',
      isPreconfigured: true,
      isDeprecated: false,
      isSystemAction: false,
      referencedByCount: 0,
    },
    {
      id: 'custom-system-abc-connector',
      actionTypeId: 'system-abc-action-type',
      name: 'SystemABC',
      isPreconfigured: true,
      isDeprecated: false,
      isSystemAction: false,
      referencedByCount: 0,
    },
    {
      id: 'preconfigured.test.index-record',
      actionTypeId: 'test.index-record',
      name: 'Test:_Preconfigured_Index_Record',
      isPreconfigured: true,
      isDeprecated: false,
      isSystemAction: false,
      referencedByCount: 0,
    },
    {
      id: 'my-test-email',
      actionTypeId: '.email',
      name: 'TestEmail#xyz',
      isPreconfigured: true,
      isDeprecated: false,
      isSystemAction: false,
      referencedByCount: 0,
    },
  ];

  describe('get all unsecured actions', () => {
    const objectRemover = new ObjectRemover(supertest);

    // need to wait for kibanaServer to settle ...
    before(() => {
      kibanaServer.resolveUrl(`/api/get_all_unsecured_actions`);
    });

    after(() => objectRemover.removeAll());

    it('should successfully get all actions', async () => {
      // Create a connector
      const { body: createdConnector1 } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/actions/connector`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'zzz - My action1',
          connector_type_id: 'test.index-record',
          config: {
            unencrypted: `This value shouldn't get encrypted`,
          },
          secrets: {
            encrypted: 'This value should be encrypted',
          },
        })
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdConnector1.id, 'connector', 'actions');

      const { body: createdConnector2 } = await supertest
        .post(`${getUrlPrefix(Spaces.other.id)}/api/actions/connector`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'zzz - My action2',
          connector_type_id: 'test.index-record',
          config: {
            unencrypted: `This value shouldn't get encrypted`,
          },
          secrets: {
            encrypted: 'This value should be encrypted',
          },
        })
        .expect(200);
      objectRemover.add(Spaces.other.id, createdConnector2.id, 'connector', 'actions');

      const space1SpaceResponse = await supertest
        .post(`/api/get_all_unsecured_actions`)
        .set('kbn-xsrf', 'xxx')
        .send({
          spaceId: Spaces.space1.id,
        })
        .expect(200);
      expect(space1SpaceResponse.body.status).to.eql('success');

      // the custom ssl connectors have dynamic ports, so remove them before
      // comparing to what we expect
      const preconfiguredWithSpace1Connector = space1SpaceResponse.body.result.filter(
        (conn: { id: string }) => !conn.id.startsWith('custom.ssl.')
      );
      expect(preconfiguredWithSpace1Connector).to.eql([
        ...preconfiguredConnectors,
        {
          id: createdConnector1.id,
          isPreconfigured: false,
          isDeprecated: false,
          name: 'zzz - My action1',
          actionTypeId: 'test.index-record',
          isMissingSecrets: false,
          isSystemAction: false,
          config: {
            unencrypted: `This value shouldn't get encrypted`,
          },
          referencedByCount: 0,
        },
      ]);

      const otherSpaceResponse = await supertest
        .post(`/api/get_all_unsecured_actions`)
        .set('kbn-xsrf', 'xxx')
        .send({
          spaceId: Spaces.other.id,
        })
        .expect(200);
      expect(otherSpaceResponse.body.status).to.eql('success');

      // the custom ssl connectors have dynamic ports, so remove them before
      // comparing to what we expect
      const preconfiguredWithOtherSpaceConnector = otherSpaceResponse.body.result.filter(
        (conn: { id: string }) => !conn.id.startsWith('custom.ssl.')
      );
      expect(preconfiguredWithOtherSpaceConnector).to.eql([
        ...preconfiguredConnectors,
        {
          id: createdConnector2.id,
          isPreconfigured: false,
          isDeprecated: false,
          name: 'zzz - My action2',
          actionTypeId: 'test.index-record',
          isMissingSecrets: false,
          isSystemAction: false,
          config: {
            unencrypted: `This value shouldn't get encrypted`,
          },
          referencedByCount: 0,
        },
      ]);
    });
  });
}
