/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import type { ActionsCommon } from './common';

export interface ConnectorFormFields {
  name: string;
  url: string;
  email: string;
  token: string;
}

export function ActionsTinesServiceProvider(
  { getService, getPageObject }: FtrProviderContext,
  common: ActionsCommon
) {
  const testSubjects = getService('testSubjects');
  const find = getService('find');

  return {
    async createNewConnector(fields: ConnectorFormFields) {
      await common.openNewConnectorForm('tines');
      await this.setConnectorFields(fields);

      const flyOutSaveButton = await testSubjects.find('create-connector-flyout-save-btn');
      expect(await flyOutSaveButton.isEnabled()).to.be(true);
      await flyOutSaveButton.click();
    },

    async setConnectorFields({ name, url, email, token }: ConnectorFormFields) {
      await testSubjects.setValue('nameInput', name);
      await testSubjects.setValue('config.url-input', url);
      await testSubjects.setValue('secrets.email-input', email);
      await testSubjects.setValue('secrets.token-input', token);
    },

    async updateConnectorFields(fields: ConnectorFormFields) {
      await this.setConnectorFields(fields);

      const editFlyOutSaveButton = await testSubjects.find('edit-connector-flyout-save-btn');
      expect(await editFlyOutSaveButton.isEnabled()).to.be(true);
      await editFlyOutSaveButton.click();
    },

    async setJsonEditor(value: object) {
      const stringified = JSON.stringify(value);

      await find.clickByCssSelector('.monaco-editor');
      const input = await find.activeElement();
      await input.clearValueWithKeyboard({ charByChar: true });
      await input.type(stringified);
    },
  };
}
