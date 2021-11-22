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

async function asyncForEach<T>(array: T[], callback: (item: T, index: number) => void) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index);
  }
}

export default ({ getService, getPageObjects }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const observability = getService('observability');

  const retry = getService('retry');

  describe.skip('Observability alerts / Bulk actions', function () {
    this.tags('includeFirefox');
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/observability/alerts');
      await esArchiver.load('x-pack/test/functional/es_archives/infra/metrics_and_logs');
      await esArchiver.load(
        'x-pack/test/apm_api_integration/common/fixtures/es_archiver/apm_8.0.0'
      );
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/infra/metrics_and_logs');
      await esArchiver.unload('x-pack/test/functional/es_archives/observability/alerts');
      await esArchiver.unload(
        'x-pack/test/apm_api_integration/common/fixtures/es_archiver/apm_8.0.0'
      );
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

      it('logs checkboxes are enabled', async () => {
        const logsCheckboxes =
          await observability.alerts.bulkActions.getCheckboxSelectorPerProducer('logs');

        await asyncForEach(logsCheckboxes, async (checkbox, index) => {
          expect(await checkbox.isEnabled()).to.be(true);
        });
      });

      describe('when checkbox is clicked', async () => {
        it('shows bulk actions container', async () => {
          const logsCheckboxes =
            await observability.alerts.bulkActions.getCheckboxSelectorPerProducer('logs');
          await logsCheckboxes[0].click();
          await observability.alerts.bulkActions.getBulkActionsContainerOrFail();
        });

        describe('when selected bulk action button is clicked', async () => {
          it('opens overflow menu with workflow status options', async () => {
            await retry.try(async () => {
              await (await observability.alerts.bulkActions.getBulkActionsButton()).click();
            });
          });
        });
      });
    });

    describe.skip('When user has all priviledges for apm app', () => {
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

      it('apm checkboxes are enabled', async () => {
        const apmCheckboxes = await observability.alerts.bulkActions.getCheckboxSelectorPerProducer(
          'apm'
        );

        await asyncForEach(apmCheckboxes, async (checkbox, index) => {
          expect(await checkbox.isEnabled()).to.be(true);
        });
      });

      describe.skip('when checkbox is clicked', async () => {
        it('shows bulk actions container', async () => {
          const apmCheckboxes =
            await observability.alerts.bulkActions.getCheckboxSelectorPerProducer('apm');
          await apmCheckboxes[0].click();
          await observability.alerts.bulkActions.getBulkActionsContainerOrFail();
        });

        describe('when selected bulk action button is clicked', async () => {
          it('opens overflow menu with workflow status options', async () => {
            await retry.try(async () => {
              await (await observability.alerts.bulkActions.getBulkActionsButton()).click();
            });
          });
        });
      });
    });

    describe.skip('When user has read permissions for logs', () => {
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

      it('checkbox is not visible', async () => {
        await observability.alerts.bulkActions.missingCheckboxSelectorOrFail();
      });
    });

    describe.skip('When user has read permissions for apm', () => {
      before(async () => {
        await observability.users.setTestUserRole(
          observability.users.defineBasicObservabilityRole({
            apm: ['read'],
          })
        );
        await observability.alerts.common.navigateToTimeWithData();
      });

      after(async () => {
        await observability.users.restoreDefaultTestUserRole();
      });

      it('checkbox is not displayed', async () => {
        await observability.alerts.bulkActions.missingCheckboxSelectorOrFail();
      });
    });

    describe.skip('When user has mixed permissions for observability apps', () => {
      before(async () => {
        await observability.users.setTestUserRole(
          observability.users.defineBasicObservabilityRole({
            logs: ['all'],
            apm: ['read'],
            observabilityCases: ['read'],
          })
        );
        await observability.alerts.common.navigateToTimeWithData();
      });

      after(async () => {
        await observability.users.restoreDefaultTestUserRole();
      });

      it('apm checkboxes are disabled', async () => {
        const apmCheckboxes = await observability.alerts.bulkActions.getCheckboxSelectorPerProducer(
          'apm'
        );

        await asyncForEach(apmCheckboxes, async (checkbox, index) => {
          expect(await checkbox.isEnabled()).to.be(false);
        });
      });

      it('logs checkboxes are enabled', async () => {
        const logsCheckboxes =
          await observability.alerts.bulkActions.getCheckboxSelectorPerProducer('logs');

        await asyncForEach(logsCheckboxes, async (checkbox, index) => {
          expect(await checkbox.isEnabled()).to.be(true);
        });
      });
    });
  });
};
