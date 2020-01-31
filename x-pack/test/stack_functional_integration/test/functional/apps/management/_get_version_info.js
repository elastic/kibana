/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export default function({ getService, getPageObjects }) {
  describe('get version info', function describeIndexTests() {
    const config = getService('config');
    const log = getService('log');
    const PageObjects = getPageObjects(['common', 'settings']);

    before(async () => {
      await PageObjects.common.navigateToApp('settings', 'power', 'changeme');
      log.debug('getVersionInfo');
      // PageObjects.common.debug('version = ' + versionInfo.version);
      // PageObjects.common.debug('Build, Commit = ' + versionInfo.build);
      config.servers.kibana.version = PageObjects.settings.getVersionInfo();
      log.debug(
        `\n### config.servers.kibana.version.version: ${config.servers.kibana.version.version}`
      );
      log.debug(
        `\n### config.servers.kibana.version.build: ${config.servers.kibana.version.build}`
      );
    });
  });
}
