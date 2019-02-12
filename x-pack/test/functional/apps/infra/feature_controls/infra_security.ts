/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from 'expect.js';
import { KibanaFunctionalTestDefaultProviders } from 'x-pack/test/types/providers';
import { DATE_WITH_DATA } from '../constants';

// tslint:disable no-default-export
export default function({ getPageObjects, getService }: KibanaFunctionalTestDefaultProviders) {
  const esArchiver = getService('esArchiver');
  const security = getService('security');
  const PageObjects = getPageObjects(['common', 'infraHome', 'security', 'spaceSelector']);
  const find = getService('find');
  const testSubjects = getService('testSubjects');
  const appsMenu = getService('appsMenu');

  describe('security feature controls', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('infra/metrics_and_logs');
    });

    describe('global infrastructure read privileges', () => {
      before(async () => {
        await security.role.create('global_infrastructure_read_role', {
          elasticsearch: {
            indices: [{ names: ['metricbeat-*'], privileges: ['read', 'view_index_metadata'] }],
          },
          kibana: [
            {
              feature: {
                infrastructure: ['read'],
              },
              spaces: ['*'],
            },
          ],
        });

        await security.user.create('global_infrastructure_read_user', {
          password: 'global_infrastructure_read_user-password',
          roles: ['global_infrastructure_read_role'],
          full_name: 'test user',
        });

        await PageObjects.security.logout();

        await PageObjects.security.login(
          'global_infrastructure_read_user',
          'global_infrastructure_read_user-password',
          {
            expectSpaceSelector: false,
          }
        );
      });

      after(async () => {
        await Promise.all([
          security.role.delete('global_infrastructure_read_role'),
          security.user.delete('global_infrastructure_read_user'),
          PageObjects.security.logout(),
        ]);
      });

      it('shows infrastructure navlink', async () => {
        const navLinks = (await appsMenu.readLinks()).map(
          (link: Record<string, string>) => link.text
        );
        expect(navLinks).to.eql(['Infrastructure', 'Management']);
      });

      it(`landing page shows Wafflemap`, async () => {
        await PageObjects.common.navigateToActualUrl('infraOps', 'home', {
          ensureCurrentUrl: true,
          shouldLoginIfPrompted: false,
        });
        await PageObjects.infraHome.goToTime(DATE_WITH_DATA);
        await testSubjects.existOrFail('waffleMap');
      });

      it(`does not show link to view logs`, async () => {
        await testSubjects.click('nodeContainer');
        await testSubjects.missingOrFail('viewLogsContentMenuItem');
      });
    });

    describe('global infrastructure & logs read-only privileges', () => {
      before(async () => {
        await security.role.create('global_infrastructure_logs_read_role', {
          elasticsearch: {
            indices: [
              {
                names: ['metricbeat-*', 'filebeat-*'],
                privileges: ['read', 'view_index_metadata'],
              },
            ],
          },
          kibana: [
            {
              feature: {
                infrastructure: ['read'],
                logs: ['read'],
              },
              spaces: ['*'],
            },
          ],
        });

        await security.user.create('global_infrastructure_logs_read_user', {
          password: 'global_infrastructure_logs_read_user-password',
          roles: ['global_infrastructure_logs_read_role'],
          full_name: 'test user',
        });

        await PageObjects.security.login(
          'global_infrastructure_logs_read_user',
          'global_infrastructure_logs_read_user-password',
          {
            expectSpaceSelector: false,
          }
        );
      });

      after(async () => {
        await security.role.delete('global_infrastructure_logs_read_role');
        await security.user.delete('global_infrastructure_logs_read_user');
      });

      it('shows infrastructure and logs navlinks', async () => {
        const navLinks = (await appsMenu.readLinks()).map(
          (link: Record<string, string>) => link.text
        );
        expect(navLinks).to.eql(['Infrastructure', 'Logs', 'Management']);
      });

      it(`landing page shows Wafflemap`, async () => {
        await PageObjects.common.navigateToActualUrl('infraOps', 'home', {
          ensureCurrentUrl: true,
          shouldLoginIfPrompted: false,
        });
        await PageObjects.infraHome.goToTime(DATE_WITH_DATA);
        await testSubjects.existOrFail('waffleMap');
      });

      it(`allows user to view logs`, async () => {
        await testSubjects.click('nodeContainer');
        await testSubjects.click('viewLogsContentMenuItem');
        await testSubjects.existOrFail('infraLogsPage');
      });
    });

    describe('no infrastructure privileges', () => {
      before(async () => {
        await security.role.create('no_infrastructure_privileges_role', {
          elasticsearch: {
            indices: [{ names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }],
          },
          kibana: [
            {
              feature: {
                discover: ['all'],
              },
              spaces: ['*'],
            },
          ],
        });

        await security.user.create('no_infrastructure_privileges_user', {
          password: 'no_infrastructure_privileges_user-password',
          roles: ['no_infrastructure_privileges_role'],
          full_name: 'test user',
        });

        await PageObjects.security.login(
          'no_infrastructure_privileges_user',
          'no_infrastructure_privileges_user-password',
          {
            expectSpaceSelector: false,
          }
        );
      });

      after(async () => {
        await security.role.delete('no_infrastructure_privileges_role');
        await security.user.delete('no_infrastructure_privileges_user');
      });

      const getMessageText = async () =>
        await (await find.byCssSelector('body>pre')).getVisibleText();

      it(`returns a 404`, async () => {
        await PageObjects.common.navigateToActualUrl('infraOps', '', {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        });
        const messageText = await getMessageText();
        expect(messageText).to.eql(
          JSON.stringify({
            statusCode: 404,
            error: 'Not Found',
            message: 'Not Found',
          })
        );
      });
    });
  });
}
