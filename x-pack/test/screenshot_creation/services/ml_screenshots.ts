/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export function MachineLearningScreenshotsProvider({ getService }: FtrProviderContext) {
  const ml = getService('ml');
  const screenshot = getService('screenshots');

  return {
    async takeScreenshot(name: string, subDirectories: string[]) {
      await screenshot.take(`${name}_new`, undefined, subDirectories);
    },

    async removeFocusFromElement() {
      // open and close the Kibana nav to un-focus the last used element
      await ml.navigation.openKibanaNav();
      await ml.navigation.closeKibanaNav();
    },
  };
}
