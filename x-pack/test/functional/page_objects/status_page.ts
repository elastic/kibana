/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export function StatusPagePageProvider({ getService }: FtrProviderContext) {
  const log = getService('log');
  const find = getService('find');
  class StatusPage {
    async initTests() {
      log.debug('StatusPage:initTests');
    }

    async expectStatusPage(): Promise<void> {
      await find.byCssSelector('[data-test-subj="statusPageRoot"]', 20000);
    }
  }

  return new StatusPage();
}
