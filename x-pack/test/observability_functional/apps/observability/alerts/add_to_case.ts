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

  describe('Observability alerts / Add to case', function () {
    this.tags('includeFirefox');

    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/observability/alerts');
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/observability/alerts');
    });

    describe('When user has all priviledges for cases', () => {
      before(async () => {
        await observability.users.setTestUserRole(
          observability.users.defineBasicObservabilityRole({
            observabilityCases: ['all'],
            logs: ['all'],
          })
        );
        await observability.alerts.common.navigateToTimeWithData();
      });

      after(async () => {
        await observability.users.restoreDefaultTestUserRole();
      });

      it('renders case options in the overflow menu', async () => {
        await observability.alerts.common.openActionsMenuForRow(0);
        await retry.try(async () => {
          await observability.alerts.common.getAddToExistingCaseSelectorOrFail();
          await observability.alerts.common.getAddToNewCaseSelectorOrFail();
        });
      });

      it('opens a flyout when Add to new case is clicked', async () => {
        await retry.try(async () => {
          await observability.alerts.common.openActionsMenuForRow(0);
          await observability.alerts.common.addToNewCaseButtonClick();
          await observability.alerts.common.getCreateCaseFlyoutOrFail();
        });
      });

      it('opens a modal when Add to existing case is clicked', async () => {});
    });

    describe('When user has read permissions for cases', () => {
      before(async () => {
        await observability.users.setTestUserRole(
          observability.users.defineBasicObservabilityRole({
            observabilityCases: ['read'],
            logs: ['all'],
          })
        );
        await observability.alerts.common.navigateToTimeWithData();
      });

      after(async () => {
        await observability.users.restoreDefaultTestUserRole();
      });

      it('does not render case options in the overflow menu', async () => {
        await observability.alerts.common.openActionsMenuForRow(0);
        await retry.try(async () => {
          await observability.alerts.common.missingAddToExistingCaseSelectorOrFail();
          await observability.alerts.common.missingAddToNewCaseSelectorOrFail();
        });
      });
    });
  });
};
