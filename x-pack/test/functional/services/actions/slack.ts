/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import type { ActionsCommon } from './common';

export interface WebhookConnectorFormFields {
  name: string;
  url: string;
}

export interface WebApiConnectorFormFields {
  name: string;
  token: string;
}

export function ActionsSlackServiceProvider(
  { getService }: FtrProviderContext,
  common: ActionsCommon
) {
  const testSubjects = getService('testSubjects');

  return {
    async createNewWebhook({ name, url }: WebhookConnectorFormFields) {
      await common.openNewConnectorForm('slack');

      await testSubjects.setValue('nameInput', name);
      await testSubjects.setValue('slackWebhookUrlInput', url);

      const flyOutSaveButton = await testSubjects.find('create-connector-flyout-save-btn');
      expect(await flyOutSaveButton.isEnabled()).to.be(true);
      await flyOutSaveButton.click();
    },
    async createNewWebAPI({ name, token }: WebApiConnectorFormFields) {
      await common.openNewConnectorForm('slack');

      const webApiTab = await testSubjects.find('.slack_apiButton');
      await webApiTab.click();

      await testSubjects.setValue('nameInput', name);
      await testSubjects.setValue('secrets.token-input', token);

      const flyOutSaveButton = await testSubjects.find('create-connector-flyout-save-btn');
      expect(await flyOutSaveButton.isEnabled()).to.be(true);
      await flyOutSaveButton.click();
    },
  };
}
