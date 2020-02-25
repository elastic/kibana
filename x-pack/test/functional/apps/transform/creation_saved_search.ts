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

export default function({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const transform = getService('transform');

  // flaky test, see #55179
  describe.skip('creation_saved_search', function() {
    this.tags(['smoke']);
    before(async () => {
      await esArchiver.load('ml/farequote');
    });

    after(async () => {
      await esArchiver.unload('ml/farequote');
      await transform.api.cleanTransformIndices();
    });

    const testDataList = [
      {
        suiteTitle: 'batch transform with terms groups and avg agg with saved search filter',
        source: 'farequote_filter',
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
          return `dest_${this.transformId}`;
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
          sourceIndex: 'farequote',
          sourcePreview: {
            column: 3,
            values: ['ASA'],
          },
        },
      },
    ];

    for (const testData of testDataList) {
      describe(`${testData.suiteTitle}`, function() {
        after(async () => {
          await transform.api.deleteIndices(testData.destinationIndex);
        });

        it('loads the home page', async () => {
          await transform.navigation.navigateTo();
          await transform.management.assertTransformListPageExists();
        });

        it('displays the stats bar', async () => {
          await transform.management.assertTransformStatsBarExists();
        });

        it('loads the source selection modal', async () => {
          await transform.management.startTransformCreation();
        });

        it('selects the source data', async () => {
          await transform.sourceSelection.selectSource(testData.source);
        });

        it('displays the define pivot step', async () => {
          await transform.wizard.assertDefineStepActive();
        });

        it('loads the source index preview', async () => {
          await transform.wizard.assertSourceIndexPreviewLoaded();
        });

        it('shows the filtered source index preview', async () => {
          await transform.wizard.assertSourceIndexPreviewColumnValues(
            testData.expected.sourcePreview.column,
            testData.expected.sourcePreview.values
          );
        });

        it('displays an empty pivot preview', async () => {
          await transform.wizard.assertPivotPreviewEmpty();
        });

        it('hides the query input', async () => {
          await transform.wizard.assertQueryInputMissing();
        });

        it('hides the advanced query editor switch', async () => {
          await transform.wizard.assertAdvancedQueryEditorSwitchMissing();
        });

        it('adds the group by entries', async () => {
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
        });

        it('adds the aggregation entries', async () => {
          for (const [index, agg] of testData.aggregationEntries.entries()) {
            await transform.wizard.assertAggregationInputExists();
            await transform.wizard.assertAggregationInputValue([]);
            await transform.wizard.addAggregationEntry(index, agg.identifier, agg.label);
          }
        });

        it('displays the advanced pivot editor switch', async () => {
          await transform.wizard.assertAdvancedPivotEditorSwitchExists();
          await transform.wizard.assertAdvancedPivotEditorSwitchCheckState(false);
        });

        it('loads the pivot preview', async () => {
          await transform.wizard.assertPivotPreviewLoaded();
        });

        it('shows the pivot preview', async () => {
          await transform.wizard.assertPivotPreviewColumnValues(
            testData.expected.pivotPreview.column,
            testData.expected.pivotPreview.values
          );
        });

        it('loads the details step', async () => {
          await transform.wizard.advanceToDetailsStep();
        });

        it('inputs the transform id', async () => {
          await transform.wizard.assertTransformIdInputExists();
          await transform.wizard.assertTransformIdValue('');
          await transform.wizard.setTransformId(testData.transformId);
        });

        it('inputs the transform description', async () => {
          await transform.wizard.assertTransformDescriptionInputExists();
          await transform.wizard.assertTransformDescriptionValue('');
          await transform.wizard.setTransformDescription(testData.transformDescription);
        });

        it('inputs the destination index', async () => {
          await transform.wizard.assertDestinationIndexInputExists();
          await transform.wizard.assertDestinationIndexValue('');
          await transform.wizard.setDestinationIndex(testData.destinationIndex);
        });

        it('displays the create index pattern switch', async () => {
          await transform.wizard.assertCreateIndexPatternSwitchExists();
          await transform.wizard.assertCreateIndexPatternSwitchCheckState(true);
        });

        it('displays the continuous mode switch', async () => {
          await transform.wizard.assertContinuousModeSwitchExists();
          await transform.wizard.assertContinuousModeSwitchCheckState(false);
        });

        it('loads the create step', async () => {
          await transform.wizard.advanceToCreateStep();
        });

        it('displays the create and start button', async () => {
          await transform.wizard.assertCreateAndStartButtonExists();
        });

        it('displays the create button', async () => {
          await transform.wizard.assertCreateButtonExists();
        });

        it('displays the copy to clipboard button', async () => {
          await transform.wizard.assertCreateAndStartButtonExists();
        });

        it('creates the transform', async () => {
          await transform.wizard.createTransform();
        });

        it('starts the transform and finishes processing', async () => {
          await transform.wizard.startTransform();
          await transform.wizard.waitForProgressBarComplete();
        });

        it('returns to the management page', async () => {
          await transform.wizard.returnToManagement();
        });

        it('displays the transforms table', async () => {
          await transform.management.assertTransformsTableExists();
        });

        it('displays the created transform in the transform list', async () => {
          await transform.table.refreshTransformList();
          await transform.table.filterWithSearchString(testData.transformId);
          const rows = await transform.table.parseTransformTable();
          expect(rows.filter(row => row.id === testData.transformId)).to.have.length(1);
        });

        it('job creation displays details for the created job in the job list', async () => {
          await transform.table.assertTransformRowFields(testData.transformId, {
            id: testData.transformId,
            description: testData.transformDescription,
            sourceIndex: testData.expected.sourceIndex,
            destinationIndex: testData.destinationIndex,
            status: testData.expected.row.status,
            mode: testData.expected.row.mode,
            progress: testData.expected.row.progress,
          });
        });

        it('expands the transform management table row and walks through available tabs', async () => {
          await transform.table.assertTransformExpandedRow();
        });

        it('displays the transform preview in the expanded row', async () => {
          await transform.table.assertTransformsExpandedRowPreviewColumnValues(
            testData.expected.pivotPreview.column,
            testData.expected.pivotPreview.values
          );
        });
      });
    }
  });
}
