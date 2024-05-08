/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export function SvlPlaygroundPageProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  return {
    PlaygrounStartChatPage: {
      async expectPlaygroundStartChatPageComponentsToExist() {
        await testSubjects.existOrFail('chat-playground-home-page-title');
        await testSubjects.existOrFail('selectIndicesChatPanel');
        await testSubjects.existOrFail('startChatButton');
      },

      async expectPlaygroundHeaderComponentsToExist() {
        await testSubjects.existOrFail('playground-header-actions');
        await testSubjects.existOrFail('playground-documentation-link');
      },
    },
  };
}
