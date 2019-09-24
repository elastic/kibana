
import {
  bdd
} from '../../../support';

import PageObjects from '../../../support/page_objects';

bdd.describe('get version info', function describeIndexTests() {
  const kbnInternVars = global.__kibana__intern__;
  const config = kbnInternVars.intern.config;

  bdd.before(function () {
    return PageObjects.common.navigateToApp('settings', 'power', 'changeme')
    .then(function () {
      PageObjects.common.debug('getVersionInfo');
      return PageObjects.settings.getVersionInfo();
    })
    .then(function (versionInfo) {
      // PageObjects.common.debug('version = ' + versionInfo.version);
      // PageObjects.common.debug('Build, Commit = ' + versionInfo.build);
      config.servers.kibana.version = versionInfo;
      PageObjects.common.debug(config.servers.kibana.version.version);
      PageObjects.common.debug(config.servers.kibana.version.build);
    });
  });

});
