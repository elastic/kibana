/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import kbnRison from '@kbn/rison';
import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { common, discover, svlCommonPage } = getPageObjects([
    'common',
    'discover',
    'svlCommonPage',
  ]);
  const testSubjects = getService('testSubjects');
  const dataViews = getService('dataViews');
  const dataGrid = getService('dataGrid');

  describe('extension getDocViewer', () => {
    before(async () => {
      await svlCommonPage.loginAsAdmin();
    });

    describe('ES|QL mode', () => {
      it('should not render custom doc viewer view', async () => {
        const state = kbnRison.encode({
          dataSource: { type: 'esql' },
          query: { esql: 'from my-example-* | sort @timestamp desc' },
        });
        await common.navigateToActualUrl('discover', `?_a=${state}`, {
          ensureCurrentUrl: false,
        });
        await discover.waitUntilSearchingHasFinished();
        await dataGrid.clickRowToggle({ rowIndex: 0 });
        await testSubjects.existOrFail('docViewerTab-doc_view_table');
        await testSubjects.existOrFail('docViewerTab-doc_view_source');
        await testSubjects.missingOrFail('docViewerTab-doc_view_example');
        expect(await testSubjects.getVisibleText('docViewerRowDetailsTitle')).to.be('Result');
      });

      it('should render custom doc viewer view', async () => {
        const state = kbnRison.encode({
          dataSource: { type: 'esql' },
          query: { esql: 'from my-example-logs | sort @timestamp desc' },
        });
        await common.navigateToActualUrl('discover', `?_a=${state}`, {
          ensureCurrentUrl: false,
        });
        await discover.waitUntilSearchingHasFinished();
        await dataGrid.clickRowToggle({ rowIndex: 0 });
        await testSubjects.existOrFail('docViewerTab-doc_view_table');
        await testSubjects.existOrFail('docViewerTab-doc_view_source');
        await testSubjects.existOrFail('docViewerTab-doc_view_example');
        expect(await testSubjects.getVisibleText('docViewerRowDetailsTitle')).to.be('Record #0');
      });
    });

    describe('data view mode', () => {
      it('should not render custom doc viewer view', async () => {
        await common.navigateToActualUrl('discover', undefined, {
          ensureCurrentUrl: false,
        });
        await dataViews.switchTo('my-example-*');
        await discover.waitUntilSearchingHasFinished();
        await dataGrid.clickRowToggle({ rowIndex: 0 });
        await testSubjects.existOrFail('docViewerTab-doc_view_table');
        await testSubjects.existOrFail('docViewerTab-doc_view_source');
        await testSubjects.missingOrFail('docViewerTab-doc_view_example');
        expect(await testSubjects.getVisibleText('docViewerRowDetailsTitle')).to.be('Document');
      });

      it('should render custom doc viewer view', async () => {
        await common.navigateToActualUrl('discover', undefined, {
          ensureCurrentUrl: false,
        });
        await dataViews.switchTo('my-example-logs');
        await discover.waitUntilSearchingHasFinished();
        await dataGrid.clickRowToggle({ rowIndex: 0 });
        await testSubjects.existOrFail('docViewerTab-doc_view_table');
        await testSubjects.existOrFail('docViewerTab-doc_view_source');
        await testSubjects.existOrFail('docViewerTab-doc_view_example');
        expect(await testSubjects.getVisibleText('docViewerRowDetailsTitle')).to.be(
          'Record #my-example-logs::XdQFDpABfGznVC1bCHLo::'
        );
      });
    });
  });
}
