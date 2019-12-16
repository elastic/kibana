/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function GrokDebuggerPageProvider({ getPageObjects, getService }) {
  const PageObjects = getPageObjects(['common']);
  const grokDebugger = getService('grokDebugger');

  return new (class LogstashPage {
    async gotoGrokDebugger() {
      await PageObjects.common.navigateToApp('grokDebugger');
      await grokDebugger.assertExists();
    }
  })();
}
