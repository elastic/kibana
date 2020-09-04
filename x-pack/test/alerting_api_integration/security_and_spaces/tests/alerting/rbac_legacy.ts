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

  const MIGRATED_ACTION_ID = '17f38826-5a8d-4a76-975a-b496e7fffe0b';
  const MIGRATED_ALERT_ID: Record<string, string> = {
    space_1_all_alerts_none_actions: '6ee9630a-a20e-44af-9465-217a3717d2ab',
    // space_1_all_with_restricted_fixture: '5cc59319-74ee-4edc-8646-a79ea91067cd',
    // space_1_all: 'd41a6abb-b93b-46df-a80a-926221ea847c',
    superuser: 'b384be60-ec53-4b26-857e-0253ee55b277',
  };

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
      objectRemover.removeAll();
      await esTestIndexTool.destroy();
      await es.indices.delete({ index: authorizationIndex });
      await esArchiver.unload('alerts_legacy');
    });
    afterEach(async () => {});

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
          const reference = `alert:migrated-to-7.10:${user.username}`;
          const migratedAlertId = MIGRATED_ALERT_ID[user.username];

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
            case 'global_read at space1':
              // These cases are not relevant as we're testing the migration of alerts which
              // were valid pre 7.10.0 and which become invalid after the introduction of RBAC in 7.10.0
              break;
            case 'space_1_all at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              break;
            case 'superuser at space1':
              await ensureLegacyAlertHasBeenMigrated(migratedAlertId);

              await updateMigratedAlertToUseApiKeyOfCurrentUser(migratedAlertId);

              await ensureAlertIsRunning();

              await updateAlertSoThatItIsNoLongerLegacy(migratedAlertId);

              // console.log(
              //   'update alert as user with privileges - so it is no longer a legacy alert'
              // );
              // update alert as user with privileges - so it is no longer a legacy alert
              const updatedKeyResponse = await alertUtils.getUpdateApiKeyRequest(migratedAlertId);
              expect(updatedKeyResponse.statusCode).to.eql(204);

              await ensureAlertIsRunning();
              break;
            case 'space_1_all_alerts_none_actions at space1':
              await ensureLegacyAlertHasBeenMigrated(migratedAlertId);

              await updateMigratedAlertToUseApiKeyOfCurrentUser(migratedAlertId);

              await ensureAlertIsRunning();

              await updateAlertSoThatItIsNoLongerLegacy(migratedAlertId);

              // attempt to update alert as user with no Actions privileges - as it is no longer a legacy alert
              // this should fail, as the user doesn't have the `execute` privilege for Actions
              const failedUpdateKeyResponse = await alertUtils.getUpdateApiKeyRequest(
                migratedAlertId
              );

              expect(failedUpdateKeyResponse.statusCode).to.eql(403);
              expect(failedUpdateKeyResponse.body).to.eql({
                error: 'Forbidden',
                message: 'Unauthorized to execute actions',
                statusCode: 403,
              });
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }

          async function ensureLegacyAlertHasBeenMigrated(alertId: string) {
            // console.log(`ensureLegacyAlertHasBeenMigrated(${alertId})`);
            const getResponse = await supertestWithoutAuth
              .get(`${getUrlPrefix(space.id)}/api/alerts/alert/${alertId}`)
              .auth(user.username, user.password);
            expect(getResponse.status).to.eql(200);
          }

          async function updateMigratedAlertToUseApiKeyOfCurrentUser(alertId: string) {
            // console.log(`updateMigratedAlertToUseApiKeyOfCurrentUser(${alertId})`);
            const createNoopAlertResponse = await alertUtils.createNoopAlert({});

            // swap out api key to run as user with no Actions privileges
            const swapResponse = await alertUtils.swapApiKeys(
              createNoopAlertResponse.body.id,
              alertId
            );
            expect(swapResponse.statusCode).to.eql(200);
            // ensure the alert is till marked as legacy despite the update of the Api key
            // this is important as proper update *should* update the legacy status of the alert
            // and we want to ensure we don't accidentally introduce a change that might break our support of legacy alerts
            expect(swapResponse.body.id).to.eql(alertId);
            expect(swapResponse.body.attributes.meta.versionLastmodified).to.eql('pre-7.10.0');

            // loading the archive likely caused the task to fail so ensure it's rescheduled to run in 2 seconds,
            // otherwise this test will stall for 5 minutes
            // no other attributes are touched, only runAt, so unless it would have ran when runAt expired, it
            // won't run now
            const taskRescheduleResult = await supertest
              .put(`${getUrlPrefix(space.id)}/api/alerts_fixture/${alertId}/reschedule_task`)
              .set('kbn-xsrf', 'foo')
              .send({
                runAt: getRunAt(2000),
              })
              .expect(200);

            // console.log(JSON.stringify(taskRescheduleResult.body));
          }

          async function ensureAlertIsRunning() {
            // console.log(`ensureAlertIsRunning(${reference})`);
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

              expect(alertSearchResult.hits.total.value).to.be.greaterThan(numberOfAlertExecutions);
              expect(actionSearchResult.hits.total.value).to.be.greaterThan(
                numberOfActionExecutions
              );
            });
          }

          async function updateAlertSoThatItIsNoLongerLegacy(alertId: string) {
            // console.log(`updateAlertSoThatItIsNoLongerLegacy(${alertId})`);
            // update the alert as super user (to avoid privilege limitations) so that it is no longer a legacy alert
            await alertUtils.updateAlwaysFiringAction({
              alertId,
              actionId: MIGRATED_ACTION_ID,
              user: Superuser,
              reference,
              overwrites: {
                name: 'Updated Alert',
                schedule: { interval: '2s' },
                throttle: '2s',
              },
            });
            // return supertest
            //   .put(`${getUrlPrefix(space.id)}/api/alerts/alert/${alertId}`)
            //   .set('kbn-xsrf', 'foo')
            //   .auth(Superuser.username, Superuser.password)
            //   .send({
            //     name: 'Updated Alert',
            //   })
            //   .expect(200);
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
