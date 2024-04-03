/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { IValidatedEvent } from '@kbn/event-log-plugin/server';
import { ESTestIndexTool, ES_TEST_INDEX_NAME } from '@kbn/alerting-api-integration-helpers';
import { systemActionScenario, UserAtSpaceScenarios } from '../../../scenarios';
import { getEventLog, getUrlPrefix, ObjectRemover } from '../../../../common/lib';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const es = getService('es');
  const retry = getService('retry');
  const esTestIndexTool = new ESTestIndexTool(es, retry);

  describe('bulk_enqueue', () => {
    const objectRemover = new ObjectRemover(supertest);

    before(async () => {
      await esTestIndexTool.destroy();
      await esTestIndexTool.setup();
    });

    after(async () => {
      await esTestIndexTool.destroy();
      await objectRemover.removeAll();
    });

    for (const scenario of [...UserAtSpaceScenarios, systemActionScenario]) {
      const { user, space } = scenario;

      it(`should handle enqueue request appropriately: ${scenario.id}`, async () => {
        const startDate = new Date().toISOString();

        const { body: createdAction } = await supertest
          .post(`${getUrlPrefix(space.id)}/api/actions/connector`)
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

        objectRemover.add(space.id, createdAction.id, 'action', 'actions');

        const connectorId = createdAction.id;
        const name = 'My action';
        const reference = `actions-enqueue-${scenario.id}:${space.id}:${connectorId}`;

        const response = await supertestWithoutAuth
          .post(`${getUrlPrefix(space.id)}/api/alerts_fixture/${connectorId}/bulk_enqueue_actions`)
          .auth(user.username, user.password)
          .set('kbn-xsrf', 'foo')
          .send({
            params: { reference, index: ES_TEST_INDEX_NAME, message: 'Testing 123' },
          });

        switch (scenario.id) {
          case 'no_kibana_privileges at space1':
          case 'space_1_all_alerts_none_actions at space1':
          case 'space_1_all at space2':
            expect(response.status).to.eql(403);
            break;
          case 'global_read at space1':
          case 'space_1_all at space1':
          case 'space_1_all_with_restricted_fixture at space1':
          case 'superuser at space1':
          case 'system_actions at space1':
            expect(response.status).to.eql(204);

            await validateEventLog({
              spaceId: space.id,
              connectorId,
              outcome: 'success',
              message: `action executed: test.index-record:${connectorId}: ${name}`,
              startDate,
            });

            await esTestIndexTool.waitForDocs('action:test.index-record', reference, 1);
            break;
          default:
            throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
        }
      });

      it(`should authorize system actions correctly: ${scenario.id}`, async () => {
        const startDate = new Date().toISOString();

        const connectorId = 'system-connector-test.system-action-kibana-privileges';
        const name = 'System action: test.system-action-kibana-privileges';
        const reference = `actions-enqueue-${scenario.id}:${space.id}:${connectorId}`;

        const response = await supertestWithoutAuth
          .post(`${getUrlPrefix(space.id)}/api/alerts_fixture/${connectorId}/bulk_enqueue_actions`)
          .auth(user.username, user.password)
          .set('kbn-xsrf', 'foo')
          .send({
            params: { index: ES_TEST_INDEX_NAME, reference },
          });

        switch (scenario.id) {
          case 'no_kibana_privileges at space1':
          case 'space_1_all_alerts_none_actions at space1':
          case 'space_1_all at space2':
            expect(response.status).to.eql(403);
            break;
          /**
           * The users in these scenarios have access
           * to Actions but do not have access to
           * the system action. They should be able to
           * enqueue the action but the execution should fail.
           */
          case 'global_read at space1':
          case 'space_1_all at space1':
          case 'space_1_all_with_restricted_fixture at space1':
            expect(response.status).to.eql(204);

            await validateEventLog({
              spaceId: space.id,
              connectorId,
              outcome: 'failure',
              message: `action execution failure: test.system-action-kibana-privileges:${connectorId}: ${name}`,
              errorMessage:
                'Unauthorized to execute a "test.system-action-kibana-privileges" action',
              startDate,
            });
            break;
          /**
           * The users in these scenarios have access
           * to Actions and to the system action. They should be able to
           * enqueue the action and the execution should succeed.
           */
          case 'superuser at space1':
          case 'system_actions at space1':
            expect(response.status).to.eql(204);

            await validateEventLog({
              spaceId: space.id,
              connectorId,
              outcome: 'success',
              message: `action executed: test.system-action-kibana-privileges:${connectorId}: ${name}`,
              startDate,
            });

            await esTestIndexTool.waitForDocs(
              'action:test.system-action-kibana-privileges',
              reference,
              1
            );
            break;
          default:
            throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
        }
      });
    }
  });

  interface ValidateEventLogParams {
    spaceId: string;
    connectorId: string;
    outcome: string;
    message: string;
    startDate: string;
    errorMessage?: string;
  }

  const validateEventLog = async (params: ValidateEventLogParams): Promise<void> => {
    const { spaceId, connectorId, outcome, message, startDate, errorMessage } = params;

    const events: IValidatedEvent[] = await retry.try(async () => {
      const events_ = await getEventLog({
        getService,
        spaceId,
        type: 'action',
        id: connectorId,
        provider: 'actions',
        actions: new Map([['execute', { gte: 1 }]]),
      });

      const filteredEvents = events_.filter((event) => event!['@timestamp']! >= startDate);
      if (filteredEvents.length < 1) throw new Error('no recent events found yet');

      return filteredEvents;
    });

    expect(events.length).to.be(1);

    const event = events[0];

    expect(event?.message).to.eql(message);
    expect(event?.event?.outcome).to.eql(outcome);

    if (errorMessage) {
      expect(event?.error?.message).to.eql(errorMessage);
    }
  };
}
