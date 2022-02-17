/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const a11y = getService('a11y');
  const transform = getService('transform');

  describe('transform', () => {
    const esArchiver = getService('esArchiver');

    before(async () => {
      await transform.securityCommon.createTransformRoles();
      await transform.securityCommon.createTransformUsers();
    });

    after(async () => {
      await transform.securityCommon.cleanTransformUsers();
      await transform.securityCommon.cleanTransformRoles();
    });

    describe('for user with full Transform access', function () {
      before(async () => {
        await transform.securityUI.loginAsTransformPowerUser();
      });

      after(async () => {
        // NOTE: Logout needs to happen before anything else to avoid flaky behavior
        await transform.securityUI.logout();
      });

      describe('with no transforms created', function () {
        it('Transform management page', async () => {
          await transform.navigation.navigateTo();
          await a11y.testAppSnapshot();
        });
      });

      describe('with data loaded', function () {
        const ecIndexPattern = 'ft_ecommerce';

        const pivotGroupByEntries = [
          {
            identifier: 'terms(category)',
            label: 'category',
          },
          {
            identifier: 'date_histogram(order_date)',
            label: 'order_date',
            intervalLabel: '1m',
          },
        ];
        const pivotAggregationEntries = [
          {
            identifier: 'avg(products.base_price)',
            label: 'products.base_price.avg',
          },
          {
            identifier: 'avg(taxful_total_price)',
            label: 'taxful_total_price.avg',
          },
        ];
        const pivotTransformId = `ec_pivot_${Date.now()}`;
        const pivotTransformDescription = 'ecommerce batch pivot transform';
        const pivotTransformDestinationIndex = `user-${pivotTransformId}`;

        const latestTransformUniqueKeys = [
          {
            identifier: 'geoip.country_iso_code',
            label: 'geoip.country_iso_code',
          },
        ];
        const latestTransformSortField = {
          identifier: 'order_date',
          label: 'order_date',
        };
        const latestTransformId = `ec_latest_${Date.now()}`;
        const latestTransformDescription = 'ecommerce batch latest transform';
        const latestTransformDestinationIndex = `user-${latestTransformId}`;

        before(async () => {
          await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/ecommerce');
          await transform.testResources.createIndexPatternIfNeeded(ecIndexPattern, 'order_date');
          await transform.testResources.setKibanaTimeZoneToUTC();
        });

        after(async () => {
          await transform.api.cleanTransformIndices();
          await transform.api.deleteIndices(pivotTransformDestinationIndex);
          await transform.api.deleteIndices(latestTransformDestinationIndex);
          await transform.testResources.deleteIndexPatternByTitle(pivotTransformDestinationIndex);
          await transform.testResources.deleteIndexPatternByTitle(latestTransformDestinationIndex);
          await transform.testResources.deleteIndexPatternByTitle(ecIndexPattern);
          await esArchiver.unload('x-pack/test/functional/es_archives/ml/ecommerce');
          await transform.testResources.resetKibanaTimeZone();
        });

        it('create transform select index pattern modal', async () => {
          await transform.navigation.navigateTo();
          await transform.management.startTransformCreation();
          await a11y.testAppSnapshot();
        });

        it('create transform configuration step source preview', async () => {
          await transform.testExecution.logTestStep(
            'transform creation selects the source data and loads the Transform wizard page'
          );
          await transform.sourceSelection.selectSource(ecIndexPattern);

          await transform.testExecution.logTestStep('loads the index preview');
          await transform.wizard.assertIndexPreviewLoaded();
          await transform.testExecution.logTestStep('displays an empty transform preview');
          await transform.wizard.assertTransformPreviewEmpty();
          await a11y.testAppSnapshot();
        });

        it('create pivot transform configuration step transform preview', async () => {
          await transform.testExecution.logTestStep('adding pivot transform group by entries');
          for (const [index, entry] of pivotGroupByEntries.entries()) {
            await transform.wizard.addGroupByEntry(
              index,
              entry.identifier,
              entry.label,
              entry.intervalLabel
            );
          }

          await transform.testExecution.logTestStep('adds pivot transform aggregation entries');
          await transform.wizard.addAggregationEntries(pivotAggregationEntries);
          await transform.wizard.assertPivotPreviewLoaded();
          await a11y.testAppSnapshot();
        });

        it('create pivot transform configuration step JSON editor', async () => {
          await transform.testExecution.logTestStep('displays the JSON pivot configuration');
          await transform.wizard.assertAdvancedPivotEditorSwitchExists();
          await transform.wizard.enableAdvancedPivotEditor();
          await a11y.testAppSnapshot();
        });

        it('create pivot transform details step', async () => {
          await transform.wizard.advanceToDetailsStep();
          await transform.testExecution.logTestStep('inputs the transform id');
          await transform.wizard.assertTransformIdInputExists();
          await transform.wizard.setTransformId(pivotTransformId);

          await transform.testExecution.logTestStep('inputs the transform description');
          await transform.wizard.assertTransformDescriptionInputExists();
          await transform.wizard.setTransformDescription(pivotTransformDescription);

          await transform.testExecution.logTestStep('inputs the destination index');
          await transform.wizard.assertDestinationIndexInputExists();
          await transform.wizard.setDestinationIndex(pivotTransformDestinationIndex);

          await a11y.testAppSnapshot();
        });

        it('create pivot transform create step', async () => {
          await transform.wizard.advanceToCreateStep();
          await transform.testExecution.logTestStep('displays the create and start button');
          await transform.wizard.assertCreateAndStartButtonExists();
          await a11y.testAppSnapshot();
        });

        it('runs the pivot transform and displays management page', async () => {
          await transform.testExecution.logTestStep('creates the transform');
          await transform.wizard.createTransform();

          await transform.testExecution.logTestStep('starts the transform and finishes processing');
          await transform.wizard.startTransform();
          await transform.wizard.waitForProgressBarComplete();

          await transform.testExecution.logTestStep('returns to the management page');
          await transform.wizard.returnToManagement();

          await transform.testExecution.logTestStep('displays the transforms table');
          await transform.management.assertTransformsTableExists();

          await a11y.testAppSnapshot();
        });

        it('create latest transform configuration step source preview', async () => {
          await transform.navigation.navigateTo();
          await transform.management.startTransformCreation();
          await transform.testExecution.logTestStep(
            'selects the source data and loads the Transform wizard page'
          );
          await transform.sourceSelection.selectSource(ecIndexPattern);
          await transform.wizard.assertIndexPreviewLoaded();
          await transform.wizard.assertTransformPreviewEmpty();

          await transform.testExecution.logTestStep('sets latest transform method');
          await transform.wizard.selectTransformFunction('latest');
          await a11y.testAppSnapshot();
        });

        it('create latest transform configuration step transform preview', async () => {
          await transform.testExecution.logTestStep('adding latest transform unique keys');
          for (const { identifier, label } of latestTransformUniqueKeys) {
            await transform.wizard.assertUniqueKeysInputExists();
            await transform.wizard.assertUniqueKeysInputValue([]);
            await transform.wizard.addUniqueKeyEntry(identifier, label);
          }

          await transform.testExecution.logTestStep('adds latest transform sort field');
          await transform.wizard.assertSortFieldInputExists();
          await transform.wizard.setSortFieldValue(
            latestTransformSortField.identifier,
            latestTransformSortField.label
          );
          await transform.wizard.assertPivotPreviewLoaded();
          await a11y.testAppSnapshot();
        });

        it('create latest transform details step', async () => {
          await transform.wizard.advanceToDetailsStep();
          await transform.testExecution.logTestStep('inputs the transform id');
          await transform.wizard.assertTransformIdInputExists();
          await transform.wizard.setTransformId(latestTransformId);

          await transform.testExecution.logTestStep('inputs the transform description');
          await transform.wizard.assertTransformDescriptionInputExists();
          await transform.wizard.setTransformDescription(latestTransformDescription);

          await transform.testExecution.logTestStep('inputs the destination index');
          await transform.wizard.assertDestinationIndexInputExists();
          await transform.wizard.setDestinationIndex(latestTransformDestinationIndex);

          await a11y.testAppSnapshot();
        });

        it('create latest transform create step', async () => {
          await transform.wizard.advanceToCreateStep();
          await transform.testExecution.logTestStep('displays the create and start button');
          await transform.wizard.assertCreateAndStartButtonExists();
          await a11y.testAppSnapshot();
        });

        it('runs the latest transform and displays management page', async () => {
          await transform.testExecution.logTestStep('creates the transform');
          await transform.wizard.createTransform();

          await transform.testExecution.logTestStep('starts the transform and finishes processing');
          await transform.wizard.startTransform();
          await transform.wizard.waitForProgressBarComplete();

          await transform.testExecution.logTestStep('returns to the management page');
          await transform.wizard.returnToManagement();

          await transform.testExecution.logTestStep('displays the transforms table');
          await transform.management.assertTransformsTableExists();

          await a11y.testAppSnapshot();
        });
      });
    });
  });
}
