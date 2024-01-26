/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export function RemoteClustersPageProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const comboBox = getService('comboBox');
  const retry = getService('retry');

  return {
    async remoteClusterCreateButton() {
      return await testSubjects.find('remoteClusterEmptyPromptCreateButton');
    },
    async createNewRemoteCluster(
      name: string,
      seedNode: string,
      proxyMode?: boolean,
      nodeConnections?: number,
      skipIfUnavailable?: boolean
    ) {
      await (await this.remoteClusterCreateButton()).click();
      await retry.waitFor('remote cluster form to be visible', async () => {
        return await testSubjects.isDisplayed('remoteClusterFormNameInput');
      });
      await testSubjects.setValue('remoteClusterFormNameInput', name);
      await comboBox.setCustom('comboBoxInput', seedNode);

      // Submit config form
      await testSubjects.click('remoteClusterFormSaveButton');

      // Complete trust setup
      await testSubjects.click('setupTrustDoneButton');
      await testSubjects.setCheckbox('remoteClusterTrustCheckboxLabel', 'check');
      await testSubjects.click('remoteClusterTrustSubmitButton');
    },
    async getRemoteClustersList() {
      const table = await testSubjects.find('remoteClusterListTable');
      const rows = await table.findAllByCssSelector('.euiTableRow');
      return await Promise.all(
        rows.map(async (row) => {
          return {
            remoteLink: await row.findByTestSubject('remoteClustersTableListClusterLink'),
            remoteName: await (
              await row.findByTestSubject('remoteClustersTableListClusterLink')
            ).getVisibleText(),
            remoteStatus: await (
              await row.findByTestSubject('remoteClusterConnectionStatusMessage')
            ).getVisibleText(),
            remoteMode: await (
              await row.findByTestSubject('remoteClusterConnectionModeMessage')
            ).getVisibleText(),
            remoteAddress: await (
              await row.findByTestSubject('remoteClusterConnectionAddressMessage')
            ).getVisibleText(),
            remoteConnectionCount: await (
              await row.findByTestSubject('remoteClusterNodeCountMessage')
            ).getVisibleText(),
          };
        })
      );
    },
  };
}
