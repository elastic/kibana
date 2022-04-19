/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { SavedObjectsUtils } from '@kbn/core/server/saved_objects';
import { UserAtSpaceScenarios, Superuser } from '../../scenarios';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import { ESTestIndexTool, getUrlPrefix, ObjectRemover, AlertUtils } from '../../../common/lib';
import { setupSpacesAndUsers } from '..';

// eslint-disable-next-line import/no-default-export
export default function alertTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const es = getService('es');
  const retry = getService('retry');
  const esArchiver = getService('esArchiver');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const esTestIndexTool = new ESTestIndexTool(es, retry);

  const MIGRATED_ACTION_ID = SavedObjectsUtils.getConvertedObjectId(
    'space1',
    'action',
    '17f38826-5a8d-4a76-975a-b496e7fffe0b'
  );

  const MIGRATED_ALERT_ID: Record<string, string> = {
    space_1_all_alerts_none_actions: SavedObjectsUtils.getConvertedObjectId(
      'space1',
      'alert',
      '6ee9630a-a20e-44af-9465-217a3717d2ab'
    ),
    space_1_all_with_restricted_fixture: SavedObjectsUtils.getConvertedObjectId(
      'space1',
      'alert',
      '5cc59319-74ee-4edc-8646-a79ea91067cd'
    ),
    space_1_all: SavedObjectsUtils.getConvertedObjectId(
      'space1',
      'alert',
      'd41a6abb-b93b-46df-a80a-926221ea847c'
    ),
    global_read: SavedObjectsUtils.getConvertedObjectId(
      'space1',
      'alert',
      '362e362b-a137-4aa2-9434-43e3d0d84a34'
    ),
    superuser: SavedObjectsUtils.getConvertedObjectId(
      'space1',
      'alert',
      'b384be60-ec53-4b26-857e-0253ee55b277'
    ),
  };

  describe('alerts', () => {
    const authorizationIndex = '.kibana-test-authorization';
    const objectRemover = new ObjectRemover(supertest);

    before(async () => {
      await esTestIndexTool.destroy();
      await esArchiver.load('x-pack/test/functional/es_archives/alerts_legacy');
      await esTestIndexTool.setup();
      await es.indices.create({ index: authorizationIndex });
      await setupSpacesAndUsers(getService);
    });

    after(async () => {
      await esTestIndexTool.destroy();
      await es.indices.delete({ index: authorizationIndex });
      await esArchiver.unload('x-pack/test/functional/es_archives/alerts_legacy');
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
          const reference = `alert:migrated-to-7.10:${user.username}`;
          const migratedAlertId = MIGRATED_ALERT_ID[user.username];

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
              // These cases are not relevant as we're testing the migration of alerts which
              // were valid pre 7.10.0 and which become invalid after the introduction of RBAC in 7.10.0
              // these cases were invalid pre 7.10.0 and remain invalid post 7.10.0
              break;
            case 'space_1_all at space1':
            case 'superuser at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              await resetTaskStatus(migratedAlertId);
              await ensureLegacyAlertHasBeenMigrated(migratedAlertId);

              await updateMigratedAlertToUseApiKeyOfCurrentUser(migratedAlertId);

              await ensureAlertIsRunning();

              await updateAlertSoThatItIsNoLongerLegacy(migratedAlertId);

              // update alert as user with privileges - so it is no longer a legacy alert
              const updatedKeyResponse = await alertUtils.getUpdateApiKeyRequest(migratedAlertId);
              expect(updatedKeyResponse.statusCode).to.eql(204);

              await ensureAlertIsRunning();
              break;
            case 'global_read at space1':
              await resetTaskStatus(migratedAlertId);
              await ensureLegacyAlertHasBeenMigrated(migratedAlertId);

              await updateMigratedAlertToUseApiKeyOfCurrentUser(migratedAlertId);

              await ensureAlertIsRunning();

              await updateAlertSoThatItIsNoLongerLegacy(migratedAlertId);

              // attempt to update alert as user with no Alerts privileges - as it is no longer a legacy alert
              // this should fail, as the user doesn't have the `updateApiKey` privilege for Alerts
              const failedUpdateKeyDueToAlertsPrivilegesResponse =
                await alertUtils.getUpdateApiKeyRequest(migratedAlertId);

              expect(failedUpdateKeyDueToAlertsPrivilegesResponse.statusCode).to.eql(403);
              expect(failedUpdateKeyDueToAlertsPrivilegesResponse.body).to.eql({
                error: 'Forbidden',
                message:
                  'Unauthorized to updateApiKey a "test.always-firing" rule for "alertsFixture"',
                statusCode: 403,
              });
              break;
            case 'space_1_all_alerts_none_actions at space1':
              await resetTaskStatus(migratedAlertId);
              await ensureLegacyAlertHasBeenMigrated(migratedAlertId);

              await updateMigratedAlertToUseApiKeyOfCurrentUser(migratedAlertId);

              await ensureAlertIsRunning();

              await updateAlertSoThatItIsNoLongerLegacy(migratedAlertId);

              // attempt to update alert as user with no Actions privileges - as it is no longer a legacy alert
              // this should fail, as the user doesn't have the `execute` privilege for Actions
              const failedUpdateKeyDueToActionsPrivilegesResponse =
                await alertUtils.getUpdateApiKeyRequest(migratedAlertId);

              expect(failedUpdateKeyDueToActionsPrivilegesResponse.statusCode).to.eql(403);
              expect(failedUpdateKeyDueToActionsPrivilegesResponse.body).to.eql({
                error: 'Forbidden',
                message: 'Unauthorized to execute actions',
                statusCode: 403,
              });
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }

          async function resetTaskStatus(alertId: string) {
            // occasionally when the task manager starts running while the alert saved objects
            // are mid-migration, the task will fail and set its status to "failed". this prevents
            // the alert from running ever again and downstream tasks that depend on successful alert
            // execution will fail. this ensures the task status is set to "idle" so the
            // task manager will continue claiming and executing it.
            await supertest
              .put(`${getUrlPrefix(space.id)}/api/alerts_fixture/${alertId}/reset_task_status`)
              .set('kbn-xsrf', 'foo')
              .send({
                status: 'idle',
              })
              .expect(200);
          }

          async function ensureLegacyAlertHasBeenMigrated(alertId: string) {
            const getResponse = await supertestWithoutAuth
              .get(`${getUrlPrefix(space.id)}/api/alerting/rule/${alertId}`)
              .auth(user.username, user.password);
            expect(getResponse.status).to.eql(200);
          }

          async function updateMigratedAlertToUseApiKeyOfCurrentUser(alertId: string) {
            // swap out api key to run as the current user
            const swapResponse = await alertUtils.replaceApiKeys(alertId);
            expect(swapResponse.statusCode).to.eql(200);
            // ensure the alert is till marked as legacy despite the update of the Api key
            // this is important as proper update *should* update the legacy status of the alert
            // and we want to ensure we don't accidentally introduce a change that might break our support of legacy alerts
            expect(swapResponse.body.id).to.eql(alertId);
            expect(swapResponse.body.attributes.meta.versionApiKeyLastmodified).to.eql(
              'pre-7.10.0'
            );

            // Get scheduled task id
            const getResponse = await supertestWithoutAuth
              .get(`${getUrlPrefix(space.id)}/api/alerting/rule/${alertId}`)
              .auth(user.username, user.password)
              .expect(200);

            // loading the archive likely caused the task to fail so ensure it's rescheduled to run in 2 seconds,
            // otherwise this test will stall for 5 minutes
            // no other attributes are touched, only runAt, so unless it would have ran when runAt expired, it
            // won't run now
            await supertest
              .put(
                `${getUrlPrefix(space.id)}/api/alerts_fixture/${
                  getResponse.body.scheduled_task_id
                }/reschedule_task`
              )
              .set('kbn-xsrf', 'foo')
              .send({
                runAt: getRunAt(2000),
              })
              .expect(200);
          }

          async function ensureAlertIsRunning() {
            // ensure the alert still runs and that it can schedule actions
            const alwaysFiringResponse = await esTestIndexTool.search(
              'alert:test.always-firing',
              reference
            );
            // @ts-expect-error doesnt handle total: number
            const numberOfAlertExecutions = alwaysFiringResponse.body.hits.total.value;

            const indexRecordResponse = await esTestIndexTool.search(
              'action:test.index-record',
              reference
            );
            // @ts-expect-error doesnt handle total: number
            const numberOfActionExecutions = indexRecordResponse.body.hits.total.value;

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

              // @ts-expect-error doesnt handle total: number
              expect(alertSearchResult.body.hits.total.value).to.be.greaterThan(
                numberOfAlertExecutions
              );
              // @ts-expect-error doesnt handle total: number
              expect(actionSearchResult.body.hits.total.value).to.be.greaterThan(
                numberOfActionExecutions
              );
            });
          }

          async function updateAlertSoThatItIsNoLongerLegacy(alertId: string) {
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
