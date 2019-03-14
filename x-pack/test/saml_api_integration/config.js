/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';

export default async function ({ readConfigFile }) {
  const kibanaAPITestsConfig = await readConfigFile(require.resolve('../../../test/api_integration/config.js'));
  const xPackAPITestsConfig = await readConfigFile(require.resolve('../api_integration/config.js'));

  const kibanaPort = xPackAPITestsConfig.get('servers.kibana.port');
  const idpPath = resolve(__dirname, '../../test/saml_api_integration/fixtures/idp_metadata.xml');

  const isV6 = (process.env.ES_SNAPSHOT_VERSION || '6.').startsWith('6.');

  const v6Args = [
    'xpack.security.authc.token.enabled=true',
    'xpack.security.authc.token.timeout=15s',
    'xpack.security.authc.realms.saml1.type=saml',
    'xpack.security.authc.realms.saml1.order=0',
    `xpack.security.authc.realms.saml1.idp.metadata.path=${idpPath}`,
    'xpack.security.authc.realms.saml1.idp.entity_id=http://www.elastic.co',
    `xpack.security.authc.realms.saml1.sp.entity_id=http://localhost:${kibanaPort}`,
    `xpack.security.authc.realms.saml1.sp.logout=http://localhost:${kibanaPort}/logout`,
    `xpack.security.authc.realms.saml1.sp.acs=http://localhost:${kibanaPort}/api/security/v1/saml`,
    'xpack.security.authc.realms.saml1.attributes.principal=urn:oid:0.0.7',
  ];

  const v7Args = [
    'xpack.security.authc.token.enabled=true',
    'xpack.security.authc.token.timeout=15s',
    'xpack.security.authc.realms.saml.saml1.order=0',
    `xpack.security.authc.realms.saml.saml1.idp.metadata.path=${idpPath}`,
    'xpack.security.authc.realms.saml.saml1.idp.entity_id=http://www.elastic.co',
    `xpack.security.authc.realms.saml.saml1.sp.entity_id=http://localhost:${kibanaPort}`,
    `xpack.security.authc.realms.saml.saml1.sp.logout=http://localhost:${kibanaPort}/logout`,
    `xpack.security.authc.realms.saml.saml1.sp.acs=http://localhost:${kibanaPort}/api/security/v1/saml`,
    'xpack.security.authc.realms.saml.saml1.attributes.principal=urn:oid:0.0.7',
  ];

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

    esTestCluster: {
      ...xPackAPITestsConfig.get('esTestCluster'),
      serverArgs: [
        ...xPackAPITestsConfig.get('esTestCluster.serverArgs'),
        ...(isV6 ? v6Args : v7Args),
      ],
    },

    kbnTestServer: {
      ...xPackAPITestsConfig.get('kbnTestServer'),
      serverArgs: [
        ...xPackAPITestsConfig.get('kbnTestServer.serverArgs'),
        '--optimize.enabled=false',
        '--server.xsrf.whitelist=[\"/api/security/v1/saml\"]',
        '--xpack.security.authProviders=[\"saml\"]',
      ],
    },
  };
}
