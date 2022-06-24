/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export function MachineLearningScreenshotsProvider({ getService }: FtrProviderContext) {
  const browser = getService('browser');
  const ml = getService('ml');
  const screenshot = getService('screenshots');

  const DEFAULT_WIDTH = 1920;
  const DEFAULT_HEIGHT = 1080;

  return {
    async takeScreenshot(name: string, subDirectories: string[], width?: number, height?: number) {
      await browser.setWindowSize(width ?? DEFAULT_WIDTH, height ?? DEFAULT_HEIGHT);
      await screenshot.take(`${name}_new`, undefined, subDirectories);
      await browser.setWindowSize(DEFAULT_WIDTH, DEFAULT_HEIGHT);
    },

    async removeFocusFromElement() {
      // open and close the Kibana nav to un-focus the last used element
      await ml.navigation.openKibanaNav();
      await ml.navigation.closeKibanaNav();
    },
  };
}
