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

  describe('for user with read only transform access', function () {
    describe('with no data loaded', function () {
      before(async () => {
        await transform.securityUI.loginAsTransformViewer();
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
          'should display a disabled "Create first transform" button'
        );
        await transform.management.assertCreateFirstTransformButtonExists();
        await transform.management.assertCreateFirstTransformButtonEnabled(false);
      });
    });

    describe('with data loaded', function () {
      const PREFIX = 'permissions_read_access';
      const transformConfigWithPivot = getPivotTransformConfig(PREFIX, false);

      before(async () => {
        await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/ecommerce');
        await transform.testResources.createIndexPatternIfNeeded('ft_ecommerce', 'order_date');

        await transform.api.createAndRunTransform(
          transformConfigWithPivot.id,
          transformConfigWithPivot
        );

        await transform.testResources.setKibanaTimeZoneToUTC();
        await transform.securityUI.loginAsTransformViewer();
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
          'should display a disabled "Create a transform" button'
        );
        await transform.management.assertCreateNewTransformButtonExists();
        await transform.management.assertCreateNewTransformButtonEnabled(false);

        await transform.testExecution.logTestStep(
          'should display the expected transform in the transform list'
        );
        await transform.table.refreshTransformList();
        await transform.table.filterWithSearchString(transformConfigWithPivot.id, 1);

        await transform.testExecution.logTestStep('should display a disabled actions popover');
        await transform.table.assertTransformRowActionsButtonEnabled(
          transformConfigWithPivot.id,
          false
        );

        await transform.testExecution.logTestStep('should show content in the expanded table row');
        await transform.table.assertTransformExpandedRow();
      });
    });
  });
}
