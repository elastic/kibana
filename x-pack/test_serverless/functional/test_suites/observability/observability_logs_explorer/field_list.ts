/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { log, timerange } from '@kbn/apm-synthtrace-client';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects([
    'observabilityLogsExplorer',
    'unifiedFieldList',
    'svlCommonPage',
  ]);
  const synthtrace = getService('svlLogsSynthtraceClient');
  const dataGrid = getService('dataGrid');
  const testSubjects = getService('testSubjects');
  const from = '2024-02-23T10:24:14.035Z';
  const to = '2024-02-23T10:25:14.091Z';

  const navigateToLogsExplorer = () =>
    PageObjects.observabilityLogsExplorer.navigateTo({
      pageState: {
        time: {
          from,
          to,
          mode: 'absolute',
        },
      },
    });

  describe('When virtual columns loads', () => {
    before(async () => {
      await synthtrace.index(generateLogsData({ from, to }));
      await PageObjects.svlCommonPage.login();
      await navigateToLogsExplorer();
    });

    after(async () => {
      await synthtrace.clean();
      await PageObjects.svlCommonPage.forceLogout();
    });

    describe('field list initialisation', () => {
      it('should display the virtual columns in the field list', async () => {
        // Smart Field group should be present
        await testSubjects.existOrFail('fieldListGroupedSmartFields');
        // Resource field should be present
        await testSubjects.existOrFail('dscFieldListPanelField-resource');
        // Content field should be present
        await testSubjects.existOrFail('dscFieldListPanelField-content');
      });

      it('should allow toggling of fields', async () => {
        const defaultLogColumns = ['@timestamp', 'resource', 'content'];
        const headerFields = await dataGrid.getHeaderFields();
        expect(headerFields).to.eql(defaultLogColumns);

        // After toggling from Field List, the resource column must disappear
        // from the table
        const toggledLogColumns = ['@timestamp', 'content'];
        await PageObjects.unifiedFieldList.clickFieldListItemToggle('resource');
        const updatedHeaderFields = await dataGrid.getHeaderFields();
        expect(updatedHeaderFields).to.eql(toggledLogColumns);
        // Field should be removed from Selected Fields
        const selectedField = await PageObjects.unifiedFieldList.isFieldSelected('resource');
        expect(selectedField).to.be(false);

        // After toggling again from Field List, the resource column must appear
        // in the table but after content column
        const reorderedLogColumns = ['@timestamp', 'content', 'resource'];
        await PageObjects.unifiedFieldList.clickFieldListItemToggle('resource');
        const updatedHeaderFields2 = await dataGrid.getHeaderFields();
        expect(updatedHeaderFields2).to.eql(reorderedLogColumns);
        // Field should be added in Selected Fields
        const selectedField2 = await PageObjects.unifiedFieldList.isFieldSelected('resource');
        expect(selectedField2).to.be(true);
      });

      it('should update selected field list when column is removed from column header', async () => {
        const selectedField = await PageObjects.unifiedFieldList.isFieldSelected('resource');
        expect(selectedField).to.be(true);

        await dataGrid.clickRemoveColumn('resource');
        const selectedField2 = await PageObjects.unifiedFieldList.isFieldSelected('resource');
        expect(selectedField2).to.be(false);
      });
    });
  });
}

function generateLogsData({ from, to, count = 1 }: { from: string; to: string; count?: number }) {
  return timerange(from, to)
    .interval('1m')
    .rate(1)
    .generator((timestamp) =>
      Array(count)
        .fill(0)
        .map(() => {
          return log
            .create()
            .message('A sample log')
            .logLevel('info')
            .timestamp(timestamp)
            .defaults({ 'service.name': 'synth-service' });
        })
    );
}
