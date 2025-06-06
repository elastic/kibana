/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { PLUGIN_ID } from '@kbn/fleet-plugin/common';

import { FtrProviderContext } from '../ftr_provider_context';

export interface IntegrationPackage {
  name: string;
  version: string;
}

export function FleetSettingsPageProvider({ getService, getPageObjects }: FtrProviderContext) {
  const pageObjects = getPageObjects(['common']);
  const testSubjects = getService('testSubjects');
  // const browser = getService('browser');
  const supertest = getService('supertest');

  return {
    async navigateToSettingsPage() {
      await pageObjects.common.navigateToApp(PLUGIN_ID, {
        hash: '/settings',
      });
    },
    async addOutputButton() {
      return await testSubjects.find('addOutputBtn');
    },
    async outputNameInput() {
      return await testSubjects.find('settingsOutputsFlyout.nameInput');
    },
    async outputTypeSelect() {
      return await testSubjects.find('settingsOutputsFlyout.typeInput');
    },

    installPackage: ({ name, version }: IntegrationPackage) => {
      return supertest
        .post(`/api/fleet/epm/packages/${name}/${version}`)
        .set('kbn-xsrf', 'xxxx')
        .send({ force: true });
    },
    async addRemoteESOutput() {
      // await (await this.addOutputButton()).click();
      // await (await this.outputNameInput()).type('Remote ES Output');
      // const outputTypeSelect = await this.outputTypeSelect();
      // await outputTypeSelect.click();
      // await (await testSubjects.find('fleetServerHosts.multiRowInput.textField')).type('http://localhost:9201');
      // await (await testSubjects.find('serviceTokenSecretInput')).type(
      //   'token'
      // );
      // await(await testSubjects.find('syncIntegrationsSwitch')).click();
    },
  };
}
