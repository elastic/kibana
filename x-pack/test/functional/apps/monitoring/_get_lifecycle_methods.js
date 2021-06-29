/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const getLifecycleMethods = (getService, getPageObjects) => {
  const esArchiver = getService('esArchiver');
  const security = getService('security');
  const PageObjects = getPageObjects(['monitoring', 'timePicker', 'security', 'common']);
  let _archive;

  return {
    async setup(archive, { from, to, useSuperUser = false }) {
      _archive = archive;
      if (!useSuperUser) {
        await security.testUser.setRoles(['monitoring_user', 'kibana_admin']);
      }

      const kibanaServer = getService('kibanaServer');
      const browser = getService('browser');

      // provide extra height for the page and avoid clusters sending telemetry during tests
      await browser.setWindowSize(1600, 1000);

      await esArchiver.load(archive);
      await kibanaServer.uiSettings.replace({});

      await PageObjects.common.navigateToApp('monitoring');

      // pause autorefresh in the time filter because we don't wait any ticks,
      // and we don't want ES to log a warning when data gets wiped out
      await PageObjects.timePicker.pauseAutoRefresh();

      await PageObjects.timePicker.setAbsoluteRange(from, to);
    },

    async tearDown() {
      await security.testUser.restoreDefaults();
      return esArchiver.unload(_archive);
    },
  };
};
