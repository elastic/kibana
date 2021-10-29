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

import { FtrProviderContext } from '../../../ftr_provider_context';

export default ({ getService, getPageObjects }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const observability = getService('observability');
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

      it('checkbox is enabled', async () => {});

      describe('when checkbox is clicked', async () => {
        it('shows bulk actions container', async () => {});

        describe('when selected bulk action button is clicked', async () => {
          it('opens overflow menu with workflow status options', async () => {});
        });
      });
    });

    describe('When user has all priviledges for apm app', () => {
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

      it('checkbox is enabled', async () => {});
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

    describe('When user has read permissions for apm', () => {
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
