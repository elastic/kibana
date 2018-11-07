/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import path from 'path';
import os from 'os';

const addPrincipalCommand = (username, password = undefined) =>
  `sudo bash /vagrant/provision/addprinc.sh ${username}${password ? ' ' + password : ''}`;

export default async function ({ readConfigFile }) {
  const kibanaAPITestsConfig = await readConfigFile(
    require.resolve('../../../test/api_integration/config.js')
  );
  const xPackAPITestsConfig = await readConfigFile(require.resolve('../api_integration/config.js'));
  const vagrantPath = path.join(__dirname, 'fixtures', 'vagrant-kdc');
  return {
    testFiles: [require.resolve('./apis')],
    servers: xPackAPITestsConfig.get('servers'),
    services: {
      chance: kibanaAPITestsConfig.get('services.chance'),
      supertestWithoutAuth: xPackAPITestsConfig.get('services.supertestWithoutAuth'),
    },
    junit: {
      reportName: 'X-Pack SAML API Integration Tests',
    },

    vagrant: {
      path: vagrantPath,
      commands: [
        addPrincipalCommand('george', 'dino'),
        addPrincipalCommand(`HTTP/${os.hostname()}`),
      ],
    },

    esTestCluster: {
      ...xPackAPITestsConfig.get('esTestCluster'),
      serverArgs: [
        ...xPackAPITestsConfig.get('esTestCluster.serverArgs'),
        'xpack.security.authc.token.enabled=true',
        'xpack.security.authc.token.timeout=15s',
        'xpack.security.authc.realms.kerb1.type=kerberos',
        'xpack.security.authc.realms.kerb1.order=0',
        `xpack.security.authc.realms.kerb1.keytab.path=${path.join(vagrantPath, 'build', 'keytabs', `HTTP_${os.hostname()}.keytab`)}`,
        'xpack.security.authc.realms.kerb1.remove_realm_name=false',
        'xpack.security.authc.realms.kerb1.krb.debug=true',
      ],
    },

    kbnTestServer: {
      ...xPackAPITestsConfig.get('kbnTestServer'),
      serverArgs: [
        ...xPackAPITestsConfig.get('kbnTestServer.serverArgs'),
        '--optimize.enabled=false',
        '--xpack.security.authProviders=["kerberos"]',
      ],
    },
  };
}
