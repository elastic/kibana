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
      await testSubjects.click('remoteClusterFormSaveButton');
    },
  };
}
