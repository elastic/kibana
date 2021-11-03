/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../ftr_provider_context';

export default ({ getService, getPageObjects }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const observability = getService('observability');
  const security = getService('security');
  const PageObjects = getPageObjects(['common', 'error', 'security']);

  const retry = getService('retry');

  describe('Observability alerts / Bulk actions', function () {
    this.tags('includeFirefox');
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/observability/alerts');
      await esArchiver.load('x-pack/test/functional/es_archives/infra/metrics_and_logs');
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/infra/metrics_and_logs');
      await esArchiver.unload('x-pack/test/functional/es_archives/observability/alerts');
    });

    describe('When user has all priviledges for logs app', () => {
      before(async () => {
        await observability.users.setTestUserRole(
          observability.users.defineBasicObservabilityRole({
            logs: ['all'],
          })
        );
        await observability.alerts.common.navigateToTimeWithData();
      });

      after(async () => {
        await observability.users.restoreDefaultTestUserRole();
      });

      it('checkbox is enabled', async () => {
        const checkboxDisabledValue =
          await observability.alerts.bulkActions.getCheckboxSelectorDisabledValue();
        expect(checkboxDisabledValue).to.be(null);
      });

      describe('when checkbox is clicked', async () => {
        it('shows bulk actions container', async () => {
          await retry.try(async () => {
            const checkbox =
              await observability.alerts.bulkActions.getCheckboxSelectorForFirstRow();
            await checkbox.click();
          });
        });

        describe('when selected bulk action button is clicked', async () => {
          it('opens overflow menu with workflow status options', async () => {});
        });
      });
    });

    describe('When user has all priviledges for apm app', () => {
      // before(async () => {
      // await PageObjects.security.forceLogout();

      // await security.role.create('global_apm_all_role', {
      //   elasticsearch: {
      //     indices: [{ names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }],
      //   },
      //   kibana: [
      //     {
      //       feature: {
      //         apm: ['all'],
      //       },
      //       spaces: ['*'],
      //     },
      //   ],
      // });

      // await security.user.create('global_apm_all_user', {
      //   password: 'global_apm_all_user-password',
      //   roles: ['global_apm_all_role'],
      //   full_name: 'test user',
      // });

      // await PageObjects.security.login('global_apm_all_user', 'global_apm_all_user-password', {
      //   expectSpaceSelector: false,
      // });

      // await observability.alerts.common.navigateToTimeWithData();
      // });

      // after(async () => {
      //   await security.role.delete('global_apm_all_role');
      //   await security.user.delete('global_apm_all_user');
      //   await PageObjects.security.forceLogout();
      // });
      before(async () => {
        await observability.users.setTestUserRole(
          observability.users.defineBasicObservabilityRole({
            apm: ['all'],
          })
        );
        await observability.alerts.common.navigateToTimeWithData();
      });

      after(async () => {
        await observability.users.restoreDefaultTestUserRole();
      });

      it('checkbox is enabled', async () => {
        const checkboxDisabledValue =
          await observability.alerts.bulkActions.getCheckboxSelectorDisabledValue();
        expect(checkboxDisabledValue).to.be(null);
      });

      describe('when checkbox is clicked', async () => {
        it('shows bulk actions container', async () => {
          await retry.try(async () => {
            const checkbox =
              await observability.alerts.bulkActions.getCheckboxSelectorForFirstRow();
            await checkbox.click();
          });
        });

        describe('when selected bulk action button is clicked', async () => {
          it('opens overflow menu with workflow status options', async () => {});
        });
      });
    });

    describe('When user has read permissions for logs', () => {
      before(async () => {
        await observability.users.setTestUserRole(
          observability.users.defineBasicObservabilityRole({
            logs: ['read'],
          })
        );
        await observability.alerts.common.navigateToTimeWithData();
      });

      after(async () => {
        await observability.users.restoreDefaultTestUserRole();
      });

      it('checkbox is disabled', async () => {});
    });

    describe.skip('When user has read permissions for apm', () => {
      before(async () => {
        await observability.users.setTestUserRole(
          observability.users.defineBasicObservabilityRole({
            logs: ['read'],
          })
        );
        await observability.alerts.common.navigateToTimeWithData();
      });

      after(async () => {
        await observability.users.restoreDefaultTestUserRole();
      });

      it('checkbox is disabled', async () => {});
    });
  });
};
