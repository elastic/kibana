/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';

import { KibanaFunctionalTestDefaultProviders } from '../../types/providers';

export function CanvasPageProvider({ getService }: KibanaFunctionalTestDefaultProviders) {
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const browser = getService('browser');

  return {
    async expectCreateWorkpadButtonEnabled() {
      const button = await testSubjects.find('create-workpad-button');
      const disabledAttr = await button.getAttribute('disabled');
      expect(disabledAttr).to.be(null);
    },

    async expectCreateWorkpadButtonDisabled() {
      const button = await testSubjects.find('create-workpad-button');
      const disabledAttr = await button.getAttribute('disabled');
      expect(disabledAttr).to.be('');
    },
  };
}
