/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export function RemoteClustersPageProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');

  enum ConnectionType {
    'cert' = 'setupTrustCertMode',
    'api' = 'setupTrustApiMode',
  }

  return {
    async remoteClusterCreateButton() {
      return await testSubjects.find('remoteClusterEmptyPromptCreateButton');
    },
    async createNewRemoteCluster(
      name: string,
      host: string,
      isCloud: boolean,
      trustMode: 'cert' | 'api' = 'cert'
    ) {
      await (await this.remoteClusterCreateButton()).click();
      await retry.waitFor('setup trust tab to be visible', async () => {
        return await testSubjects.isDisplayed('remoteClusterTrustNextButton');
      });
      await testSubjects.click(ConnectionType[trustMode]);
      await testSubjects.click('remoteClusterTrustNextButton');

      await retry.waitFor('form tab to be visible', async () => {
        return await testSubjects.isDisplayed('remoteClusterFormNextButton');
      });

      await testSubjects.setValue('remoteClusterFormNameInput', name);
      const hostFieldId = isCloud
        ? 'remoteClusterFormRemoteAddressInput'
        : 'remoteClusterFormSeedsInput';
      await testSubjects.setValue(hostFieldId, host);
      await testSubjects.click('remoteClusterFormNextButton');

      await retry.waitFor('review tab to be visible', async () => {
        return await testSubjects.isDisplayed('remoteClusterReviewtNextButton');
      });
      // Submit config form
      await testSubjects.click('remoteClusterReviewtNextButton');
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
