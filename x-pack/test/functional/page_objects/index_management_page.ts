/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { map as mapAsync } from 'bluebird';
import { FtrProviderContext } from '../ftr_provider_context';

export function IndexManagementPageProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');

  return {
    async sectionHeadingText() {
      return await testSubjects.getVisibleText('appTitle');
    },
    async reloadIndicesButton() {
      return await testSubjects.find('reloadIndicesButton');
    },
    async toggleRollupIndices() {
      await testSubjects.click('checkboxToggles-rollupToggle');
    },

    async getIndexList() {
      const indices = await testSubjects.findAll('indexTableRow');
      return mapAsync(indices, async index => {
        const indexNameLinkCell = await index.findByCssSelector(
          '[data-test-subj="indexTableIndexNameLink"]'
        );
        const indexHealthCell = await index.findByCssSelector(
          '[data-test-subj="indexTableCell-health"]'
        );
        const indexStatusCell = await index.findByCssSelector(
          '[data-test-subj="indexTableCell-status"]'
        );
        const indexPrimaryCell = await index.findByCssSelector(
          '[data-test-subj="indexTableCell-primary"]'
        );
        const indexReplicasCell = await index.findByCssSelector(
          '[data-test-subj="indexTableCell-replica"]'
        );
        const indexDocumentsCell = await index.findByCssSelector(
          '[data-test-subj="indexTableCell-documents"]'
        );
        const indexSizeCell = await index.findByCssSelector(
          '[data-test-subj="indexTableCell-size"]'
        );

        return {
          indexName: await indexNameLinkCell.getVisibleText(),
          indexHealth: await indexHealthCell.getVisibleText(),
          indexStatus: await indexStatusCell.getVisibleText(),
          indexPrimary: await indexPrimaryCell.getVisibleText(),
          indexReplicas: await indexReplicasCell.getVisibleText(),
          indexDocuments: await indexDocumentsCell.getVisibleText(),
          indexSize: await indexSizeCell.getVisibleText(),
        };
      });
    },
    async changeTabs(tab: 'indicesTab' | 'templatesTab') {
      return await testSubjects.click(tab);
    },
  };
}
