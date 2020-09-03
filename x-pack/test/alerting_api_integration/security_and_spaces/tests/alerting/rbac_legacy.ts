/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { UserAtSpaceScenarios, Superuser } from '../../scenarios';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import { ESTestIndexTool, getUrlPrefix, ObjectRemover, AlertUtils } from '../../../common/lib';
import { setupSpacesAndUsers } from '..';

// eslint-disable-next-line import/no-default-export
export default function alertTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const es = getService('legacyEs');
  const retry = getService('retry');
  const esArchiver = getService('esArchiver');
  const securityService = getService('security');
  const spacesService = getService('spaces');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const esTestIndexTool = new ESTestIndexTool(es, retry);

  const MIGRATED_ACTION_ID = '9a0a702d-8ae9-4415-a0b7-45d1866644f5';
  const MIGRATED_ALERT_ID = 'afb46baf-77bb-4cb7-a323-5eb7b22c82aa';

  describe('alerts', () => {
    const authorizationIndex = '.kibana-test-authorization';
    const objectRemover = new ObjectRemover(supertest);

    before(async () => {
      await esTestIndexTool.destroy();
      await esArchiver.load('alerts_legacy');
      await esTestIndexTool.setup();
      await es.indices.create({ index: authorizationIndex });
      await setupSpacesAndUsers(spacesService, securityService);
    });
    beforeEach(async () => {});

    after(async () => {
      await esTestIndexTool.destroy();
      await es.indices.delete({ index: authorizationIndex });
      await esArchiver.unload('alerts_legacy');
    });
    afterEach(async () => {
      objectRemover.removeAll();
    });

    for (const scenario of UserAtSpaceScenarios) {
      const { user, space } = scenario;

      describe(scenario.id, () => {
        let alertUtils: AlertUtils;

        before(async () => {
          alertUtils = new AlertUtils({
            user,
            space,
            supertestWithoutAuth,
            indexRecordActionId: MIGRATED_ACTION_ID,
            objectRemover,
          });
        });

        it('should schedule actions on legacy alerts', async () => {
          const reference = 'alert:legacy:migrated-to-7.10';

          const getResponse = await supertestWithoutAuth
            .get(`${getUrlPrefix(space.id)}/api/alerts/alert/${MIGRATED_ALERT_ID}`)
            .auth(user.username, user.password);

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
              expect(getResponse.statusCode).to.eql(403);
              // expect(createNoopAlertResponse.statusCode).to.eql(403);
              break;
            case 'space_1_all at space2':
              expect(getResponse.statusCode).to.eql(404);
              // expect(createNoopAlertResponse.statusCode).to.eql(403);
              break;
            case 'global_read at space1':
            case 'space_1_all at space1':
            case 'superuser at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(getResponse.status).to.eql(200);
              break;
            case 'space_1_all_alerts_none_actions at space1':
              expect(getResponse.status).to.eql(200);

              const createNoopAlertResponse = await alertUtils.createNoopAlert({});

              // swap out api key to run as user with no Actions privileges
              const swapResponse = await alertUtils.swapApiKeys(
                createNoopAlertResponse.body.id,
                MIGRATED_ALERT_ID
              );
              expect(swapResponse.statusCode).to.eql(200);
              // ensure the alert is till marked as legacy despite the update of the Api key
              // this is important as proper update *should* update the legacy status of the alert
              // and we want to ensure we don't accidentally introduce a change that might break our support of legacy alerts
              expect(swapResponse.body.id).to.eql(MIGRATED_ALERT_ID);
              expect(swapResponse.body.attributes.meta.versionLastmodified).to.eql('pre-7.10.0');

              // loading the archive likely caused the task to fail so ensure it's rescheduled to run in 10 seconds,
              // otherwise this test will stall for 5 minutes
              // no other attributes are touched, only runAt, so unless it would have ran when runAt expired, it
              // won't run now
              await supertest
                .put(
                  `${getUrlPrefix(
                    space.id
                  )}/api/alerts_fixture/${MIGRATED_ALERT_ID}/reschedule_task`
                )
                .set('kbn-xsrf', 'foo')
                .send({
                  runAt: getRunAt(10000),
                })
                .expect(200);

              // ensure the alert still runs and that it can schedule actions
              const numberOfAlertExecutions = (
                await esTestIndexTool.search('alert:test.always-firing', reference)
              ).hits.total.value;

              const numberOfActionExecutions = (
                await esTestIndexTool.search('action:test.index-record', reference)
              ).hits.total.value;

              // wait for alert to execute and for its action to be scheduled and run
              await retry.try(async () => {
                const alertSearchResult = await esTestIndexTool.search(
                  'alert:test.always-firing',
                  reference
                );

                const actionSearchResult = await esTestIndexTool.search(
                  'action:test.index-record',
                  reference
                );

                expect(alertSearchResult.hits.total.value).to.be.greaterThan(
                  numberOfAlertExecutions
                );
                expect(actionSearchResult.hits.total.value).to.be.greaterThan(
                  numberOfActionExecutions
                );
              });

              // update the alert as super user so that it is no longer a legacy alert
              await alertUtils.updateAlwaysFiringAction({
                alertId: MIGRATED_ALERT_ID,
                actionId: MIGRATED_ACTION_ID,
                user: Superuser,
                reference: alertUtils.generateReference(),
                overwrites: {
                  name: 'Updated Alert',
                },
              });

              // attempt to update alert as user with no Actions privileges - as it is no longer a legacy alert
              // this should fail, as the user doesn't have the `execute` privilege for Actions
              const updatedKeyResponse = await alertUtils.getUpdateApiKeyRequest(MIGRATED_ALERT_ID);

              expect(updatedKeyResponse.statusCode).to.eql(403);
              expect(updatedKeyResponse.body).to.eql({
                error: 'Forbidden',
                message: 'Unauthorized to execute actions',
                statusCode: 403,
              });
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });
      });
    }
  });
}

function getRunAt(delayInMs: number) {
  const runAt = new Date();
  runAt.setMilliseconds(new Date().getMilliseconds() + delayInMs);
  return runAt.toISOString();
}
