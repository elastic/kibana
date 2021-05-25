/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolve } from 'path';
import { FtrConfigProviderContext } from '@kbn/test';
import { services } from '../functional/services';
import { pageObjects } from '../functional/page_objects';

// the default export of config files must be a config provider
// that returns an object with the projects config values
export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const kibanaCommonConfig = await readConfigFile(
    require.resolve('../../../test/common/config.js')
  );
  const kibanaFunctionalConfig = await readConfigFile(
    require.resolve('../../../test/functional/config.js')
  );

  const kibanaPort = kibanaFunctionalConfig.get('servers.kibana.port');
  const idpPath = resolve(
    __dirname,
    '../security_api_integration/fixtures/saml/saml_provider/metadata.xml'
  );
  const samlIdPPlugin = resolve(
    __dirname,
    '../security_api_integration/fixtures/saml/saml_provider'
  );

  const testEndpointsPlugin = resolve(__dirname, './fixtures/common/test_endpoints');

  return {
    testFiles: [resolve(__dirname, './tests/login_selector')],

    services,
    pageObjects,

    servers: kibanaFunctionalConfig.get('servers'),

    esTestCluster: {
      license: 'trial',
      from: 'snapshot',
      serverArgs: [
        'xpack.security.authc.token.enabled=true',
        'xpack.security.authc.realms.native.native1.order=0',
        'xpack.security.authc.realms.saml.saml1.order=1',
        `xpack.security.authc.realms.saml.saml1.idp.metadata.path=${idpPath}`,
        'xpack.security.authc.realms.saml.saml1.idp.entity_id=http://www.elastic.co/saml1',
        `xpack.security.authc.realms.saml.saml1.sp.entity_id=http://localhost:${kibanaPort}`,
        `xpack.security.authc.realms.saml.saml1.sp.logout=http://localhost:${kibanaPort}/logout`,
        `xpack.security.authc.realms.saml.saml1.sp.acs=http://localhost:${kibanaPort}/api/security/saml/callback`,
        'xpack.security.authc.realms.saml.saml1.attributes.principal=urn:oid:0.0.7',
      ],
    },

    kbnTestServer: {
      ...kibanaCommonConfig.get('kbnTestServer'),
      serverArgs: [
        ...kibanaCommonConfig.get('kbnTestServer.serverArgs'),
        `--plugin-path=${samlIdPPlugin}`,
        `--plugin-path=${testEndpointsPlugin}`,
        '--server.uuid=5b2de169-2785-441b-ae8c-186a1936b17d',
        '--xpack.security.encryptionKey="wuGNaIhoMpk5sO4UBxgr3NyW1sFcLgIf"',
        `--xpack.security.loginHelp="Some-login-help."`,
        `--xpack.security.authc.providers=${JSON.stringify({
          basic: { basic1: { order: 0 } },
          saml: {
            saml1: {
              order: 1,
              realm: 'saml1',
              description: 'Log-in-with-SAML',
              icon: 'logoKibana',
            },
            unknown_saml: {
              order: 2,
              realm: 'unknown_realm',
              description: 'Do-not-log-in-with-THIS-SAML',
              icon: 'logoAWS',
            },
          },
          anonymous: {
            anonymous1: {
              order: 3,
              credentials: { username: 'anonymous_user', password: 'changeme' },
            },
          },
        })}`,
      ],
    },
    uiSettings: {
      defaults: {
        'accessibility:disableAnimations': true,
        'dateFormat:tz': 'UTC',
      },
    },
    apps: kibanaFunctionalConfig.get('apps'),
    esArchiver: { directory: resolve(__dirname, 'es_archives') },
    screenshots: { directory: resolve(__dirname, 'screenshots') },

    junit: {
      reportName: 'Chrome X-Pack Security Functional Tests (Login Selector)',
    },
  };
}
