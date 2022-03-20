/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPivotTransformConfig } from '../index';

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const transform = getService('transform');

  describe('for user with full transform access', function () {
    describe('with no data loaded', function () {
      before(async () => {
        await transform.securityUI.loginAsTransformPowerUser();
      });

      after(async () => {
        // NOTE: Logout needs to happen before anything else to avoid flaky behavior
        await transform.securityUI.logout();
      });

      it('should display elements in the Transform list page correctly', async () => {
        await transform.testExecution.logTestStep('should load the Transform list page');
        await transform.navigation.navigateTo();
        await transform.management.assertTransformListPageExists();

        await transform.testExecution.logTestStep('should display the stats bar');
        await transform.management.assertTransformStatsBarExists();

        await transform.testExecution.logTestStep(
          'should display the "No transforms found" message'
        );
        await transform.management.assertNoTransformsFoundMessageExists();

        await transform.testExecution.logTestStep(
          'should display an enabled "Create first transform" button'
        );
        await transform.management.assertCreateFirstTransformButtonExists();
        await transform.management.assertCreateFirstTransformButtonEnabled(true);
      });
    });

    describe('with data loaded', function () {
      const PREFIX = 'permissions_full_access';
      const transformConfigWithPivot = getPivotTransformConfig(PREFIX, false);

      before(async () => {
        await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/ecommerce');
        await transform.testResources.createIndexPatternIfNeeded('ft_ecommerce', 'order_date');

        await transform.api.createAndRunTransform(
          transformConfigWithPivot.id,
          transformConfigWithPivot
        );

        await transform.testResources.setKibanaTimeZoneToUTC();
        await transform.securityUI.loginAsTransformPowerUser();
      });

      after(async () => {
        await transform.testResources.deleteIndexPatternByTitle(
          transformConfigWithPivot.dest.index
        );
        await transform.api.deleteIndices(transformConfigWithPivot.dest.index);
        await transform.api.cleanTransformIndices();
        await transform.testResources.deleteIndexPatternByTitle('ft_ecommerce');
      });

      it('should display elements in the Transform list page correctly', async () => {
        await transform.testExecution.logTestStep('should load the Transform list page');
        await transform.navigation.navigateTo();
        await transform.management.assertTransformListPageExists();

        await transform.testExecution.logTestStep('should display the stats bar');
        await transform.management.assertTransformStatsBarExists();

        await transform.testExecution.logTestStep('should display the transforms table');
        await transform.management.assertTransformsTableExists();

        await transform.testExecution.logTestStep(
          'should display an enabled "Create a transform" button'
        );
        await transform.management.assertCreateNewTransformButtonExists();
        await transform.management.assertCreateNewTransformButtonEnabled(true);

        await transform.testExecution.logTestStep(
          'should display the expected transform in the transform list'
        );
        await transform.table.refreshTransformList();
        await transform.table.filterWithSearchString(transformConfigWithPivot.id, 1);

        await transform.testExecution.logTestStep('should show the actions popover');
        await transform.table.assertTransformRowActionsButtonEnabled(
          transformConfigWithPivot.id,
          true
        );
        await transform.table.assertTransformRowActions(transformConfigWithPivot.id, false);

        await transform.testExecution.logTestStep('should have the edit action enabled');
        await transform.table.assertTransformRowActionEnabled(
          transformConfigWithPivot.id,
          'Edit',
          true
        );

        await transform.testExecution.logTestStep('should have the clone action enabled');
        await transform.table.assertTransformRowActionEnabled(
          transformConfigWithPivot.id,
          'Clone',
          true
        );
        await transform.testExecution.logTestStep('should have the delete action enabled');
        await transform.table.assertTransformRowActionEnabled(
          transformConfigWithPivot.id,
          'Delete',
          true
        );
        await transform.testExecution.logTestStep('should have the Discover action disabled');
        await transform.table.assertTransformRowActionEnabled(
          transformConfigWithPivot.id,
          'Discover',
          false
        );
        await transform.testExecution.logTestStep('should have the start action disabled');
        await transform.table.assertTransformRowActionEnabled(
          transformConfigWithPivot.id,
          'Start',
          false
        );

        await transform.testExecution.logTestStep('should show content in the expanded table row');
        await transform.table.assertTransformExpandedRow();
      });

      it('should display controls in the edit flyout correctly', async () => {
        await transform.testExecution.logTestStep('should show the edit flyout');
        await transform.table.clickTransformRowAction(transformConfigWithPivot.id, 'Edit');
        await transform.editFlyout.assertTransformEditFlyoutExists();

        await transform.testExecution.logTestStep('should have the description input enabled');
        await transform.editFlyout.assertTransformEditFlyoutInputEnabled('Description', true);

        await transform.testExecution.logTestStep('should have the frequency input enabled');
        await transform.editFlyout.assertTransformEditFlyoutInputEnabled('Frequency', true);

        await transform.testExecution.logTestStep('should have the destination inputs enabled');
        await transform.editFlyout.openTransformEditAccordionDestinationSettings();
        await transform.editFlyout.assertTransformEditFlyoutInputEnabled('DestinationIndex', true);
        await transform.editFlyout.assertTransformEditFlyoutIngestPipelineFieldSelectExists();

        await transform.testExecution.logTestStep(
          'should have the retention policy switch enabled'
        );
        await transform.editFlyout.assertTransformEditFlyoutRetentionPolicySwitchEnabled(true);

        await transform.testExecution.logTestStep(
          'should have the advanced settings inputs enabled'
        );
        await transform.editFlyout.openTransformEditAccordionAdvancedSettings();
        await transform.editFlyout.assertTransformEditFlyoutInputEnabled('DocsPerSecond', true);
        await transform.editFlyout.assertTransformEditFlyoutInputEnabled('MaxPageSearchSize', true);

        await transform.testExecution.logTestStep(
          'should have the update button enabled after making an edit'
        );
        await transform.editFlyout.assertTransformEditFlyoutInputExists('Frequency');
        await transform.editFlyout.setTransformEditFlyoutInputValue('Frequency', '10m');
        await transform.editFlyout.assertUpdateTransformButtonExists();
        await transform.editFlyout.assertUpdateTransformButtonEnabled(true);
      });
    });
  });
}
