/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

interface GroupByEntry {
  identifier: string;
  label: string;
  intervalLabel?: string;
}

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const transform = getService('transform');

  describe('creation_saved_search', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('ml/farequote');
      await transform.testResources.createIndexPatternIfNeeded('ft_farequote', '@timestamp');
      await transform.testResources.createSavedSearchFarequoteFilterIfNeeded();
      await transform.testResources.setKibanaTimeZoneToUTC();

      await transform.securityUI.loginAsTransformPowerUser();
    });

    after(async () => {
      await transform.api.cleanTransformIndices();
    });

    const testDataList = [
      {
        suiteTitle: 'batch transform with terms groups and avg agg with saved search filter',
        source: 'ft_farequote_filter',
        groupByEntries: [
          {
            identifier: 'terms(airline)',
            label: 'airline',
          } as GroupByEntry,
        ],
        aggregationEntries: [
          {
            identifier: 'avg(responsetime)',
            label: 'responsetime.avg',
          },
        ],
        transformId: `fq_1_${Date.now()}`,
        transformDescription:
          'farequote batch transform with groups terms(airline) and aggregation avg(responsetime.avg) with saved search filter',
        get destinationIndex(): string {
          return `user-${this.transformId}`;
        },
        expected: {
          pivotPreview: {
            column: 0,
            values: ['ASA'],
          },
          row: {
            status: 'stopped',
            mode: 'batch',
            progress: '100',
          },
          sourceIndex: 'ft_farequote',
          indexPreview: {
            column: 2,
            values: ['ASA'],
          },
        },
      },
    ];

    for (const testData of testDataList) {
      describe(`${testData.suiteTitle}`, function () {
        after(async () => {
          await transform.api.deleteIndices(testData.destinationIndex);
          await transform.testResources.deleteIndexPatternByTitle(testData.destinationIndex);
        });

        it('loads the wizard for the source data', async () => {
          await transform.testExecution.logTestStep('loads the home page');
          await transform.navigation.navigateTo();
          await transform.management.assertTransformListPageExists();

          await transform.testExecution.logTestStep('displays the stats bar');
          await transform.management.assertTransformStatsBarExists();

          await transform.testExecution.logTestStep('loads the source selection modal');
          await transform.management.startTransformCreation();

          await transform.testExecution.logTestStep('selects the source data');
          await transform.sourceSelection.selectSource(testData.source);
        });

        it('navigates through the wizard and sets all needed fields', async () => {
          await transform.testExecution.logTestStep('displays the define pivot step');
          await transform.wizard.assertDefineStepActive();

          await transform.testExecution.logTestStep('loads the index preview');
          await transform.wizard.assertIndexPreviewLoaded();

          await transform.testExecution.logTestStep('shows the filtered index preview');
          await transform.wizard.assertIndexPreviewColumnValues(
            testData.expected.indexPreview.column,
            testData.expected.indexPreview.values
          );

          await transform.testExecution.logTestStep('displays an empty pivot preview');
          await transform.wizard.assertPivotPreviewEmpty();

          await transform.testExecution.logTestStep('hides the query input');
          await transform.wizard.assertQueryInputMissing();

          await transform.testExecution.logTestStep('hides the advanced query editor switch');
          await transform.wizard.assertAdvancedQueryEditorSwitchMissing();

          await transform.testExecution.logTestStep('adds the group by entries');
          for (const [index, entry] of testData.groupByEntries.entries()) {
            await transform.wizard.assertGroupByInputExists();
            await transform.wizard.assertGroupByInputValue([]);
            await transform.wizard.addGroupByEntry(
              index,
              entry.identifier,
              entry.label,
              entry.intervalLabel
            );
          }

          await transform.testExecution.logTestStep('adds the aggregation entries');
          for (const [index, agg] of testData.aggregationEntries.entries()) {
            await transform.wizard.assertAggregationInputExists();
            await transform.wizard.assertAggregationInputValue([]);
            await transform.wizard.addAggregationEntry(index, agg.identifier, agg.label);
          }

          await transform.testExecution.logTestStep('displays the advanced pivot editor switch');
          await transform.wizard.assertAdvancedPivotEditorSwitchExists();
          await transform.wizard.assertAdvancedPivotEditorSwitchCheckState(false);

          await transform.testExecution.logTestStep('loads the pivot preview');
          await transform.wizard.assertPivotPreviewLoaded();

          await transform.testExecution.logTestStep('shows the pivot preview');
          await transform.wizard.assertPivotPreviewColumnValues(
            testData.expected.pivotPreview.column,
            testData.expected.pivotPreview.values
          );

          await transform.testExecution.logTestStep('loads the details step');
          await transform.wizard.advanceToDetailsStep();

          await transform.testExecution.logTestStep('inputs the transform id');
          await transform.wizard.assertTransformIdInputExists();
          await transform.wizard.assertTransformIdValue('');
          await transform.wizard.setTransformId(testData.transformId);

          await transform.testExecution.logTestStep('inputs the transform description');
          await transform.wizard.assertTransformDescriptionInputExists();
          await transform.wizard.assertTransformDescriptionValue('');
          await transform.wizard.setTransformDescription(testData.transformDescription);

          await transform.testExecution.logTestStep('inputs the destination index');
          await transform.wizard.assertDestinationIndexInputExists();
          await transform.wizard.assertDestinationIndexValue('');
          await transform.wizard.setDestinationIndex(testData.destinationIndex);

          await transform.testExecution.logTestStep('displays the create index pattern switch');
          await transform.wizard.assertCreateIndexPatternSwitchExists();
          await transform.wizard.assertCreateIndexPatternSwitchCheckState(true);

          await transform.testExecution.logTestStep('displays the continuous mode switch');
          await transform.wizard.assertContinuousModeSwitchExists();
          await transform.wizard.assertContinuousModeSwitchCheckState(false);

          await transform.testExecution.logTestStep('loads the create step');
          await transform.wizard.advanceToCreateStep();

          await transform.testExecution.logTestStep('displays the create and start button');
          await transform.wizard.assertCreateAndStartButtonExists();
          await transform.wizard.assertCreateAndStartButtonEnabled(true);

          await transform.testExecution.logTestStep('displays the create button');
          await transform.wizard.assertCreateButtonExists();
          await transform.wizard.assertCreateButtonEnabled(true);

          await transform.testExecution.logTestStep('displays the copy to clipboard button');
          await transform.wizard.assertCopyToClipboardButtonExists();
          await transform.wizard.assertCopyToClipboardButtonEnabled(true);
        });

        it('runs the transform and displays it correctly in the job list', async () => {
          await transform.testExecution.logTestStep('creates the transform');
          await transform.wizard.createTransform();

          await transform.testExecution.logTestStep('starts the transform and finishes processing');
          await transform.wizard.startTransform();
          await transform.wizard.waitForProgressBarComplete();

          await transform.testExecution.logTestStep('returns to the management page');
          await transform.wizard.returnToManagement();

          await transform.testExecution.logTestStep('displays the transforms table');
          await transform.management.assertTransformsTableExists();

          await transform.testExecution.logTestStep(
            'displays the created transform in the transform list'
          );
          await transform.table.refreshTransformList();
          await transform.table.filterWithSearchString(testData.transformId);
          const rows = await transform.table.parseTransformTable();
          expect(rows.filter((row) => row.id === testData.transformId)).to.have.length(1);

          await transform.testExecution.logTestStep(
            'transform creation displays details for the created transform in the transform list'
          );
          await transform.table.assertTransformRowFields(testData.transformId, {
            id: testData.transformId,
            description: testData.transformDescription,
            status: testData.expected.row.status,
            mode: testData.expected.row.mode,
            progress: testData.expected.row.progress,
          });

          await transform.testExecution.logTestStep(
            'expands the transform management table row and walks through available tabs'
          );
          await transform.table.assertTransformExpandedRow();

          await transform.testExecution.logTestStep(
            'displays the transform preview in the expanded row'
          );
          await transform.table.assertTransformsExpandedRowPreviewColumnValues(
            testData.expected.pivotPreview.column,
            testData.expected.pivotPreview.values
          );
        });
      });
    }
  });
}
