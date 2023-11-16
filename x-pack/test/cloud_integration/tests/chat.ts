/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common']);

  // TODO: the whole suite doesn't run on ci https://github.com/elastic/kibana/issues/159401
  describe('Cloud Chat integration', function () {
    it('chat widget is present in header', async () => {
      await PageObjects.common.navigateToUrl('home');

      // button is visible
      await testSubjects.existOrFail('cloud-chat');

      // the chat widget is not visible (but in DOM)
      await testSubjects.missingOrFail('cloud-chat-frame', {
        allowHidden: true,
      });

      await testSubjects.click('cloud-chat');
      await testSubjects.existOrFail('cloud-chat-frame');
    });
  });
}
