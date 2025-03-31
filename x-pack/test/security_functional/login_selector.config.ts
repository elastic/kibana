/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolve } from 'path';

import { ScoutTestRunConfigCategory } from '@kbn/scout-info';
import type { FtrConfigProviderContext } from '@kbn/test';

import { pageObjects } from '../functional/page_objects';
import { services } from '../functional/services';

// the default export of config files must be a config provider
// that returns an object with the projects config values
export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const kibanaCommonConfig = await readConfigFile(
    require.resolve('@kbn/test-suites-src/common/config')
  );
  const kibanaFunctionalConfig = await readConfigFile(
    require.resolve('@kbn/test-suites-src/functional/config.base')
  );

  const kibanaPort = kibanaFunctionalConfig.get('servers.kibana.port');
  const idpPath = resolve(
    __dirname,
    '../security_api_integration/plugins/saml_provider/metadata.xml'
  );
  const idpNeverLoginPath = require.resolve(
    '@kbn/security-api-integration-helpers/saml/idp_metadata_never_login.xml'
  );
  const samlIdPPlugin = resolve(__dirname, '../security_api_integration/plugins/saml_provider');

  const testEndpointsPlugin = resolve(__dirname, './plugins/test_endpoints');

  return {
    testConfigCategory: ScoutTestRunConfigCategory.UI_TEST,
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
        'xpack.security.authc.realms.saml.saml_never.order=2',
        `xpack.security.authc.realms.saml.saml_never.idp.metadata.path=${idpNeverLoginPath}`,
        'xpack.security.authc.realms.saml.saml_never.idp.entity_id=http://www.elastic.co/saml1',
        `xpack.security.authc.realms.saml.saml_never.sp.entity_id=http://localhost:${kibanaPort}`,
        `xpack.security.authc.realms.saml.saml_never.sp.logout=http://localhost:${kibanaPort}/logout`,
        `xpack.security.authc.realms.saml.saml_never.sp.acs=http://localhost:${kibanaPort}/api/security/saml/callback`,
        'xpack.security.authc.realms.saml.saml_never.attributes.principal=urn:oid:0.0.7',
      ],
    },

    kbnTestServer: {
      ...kibanaCommonConfig.get('kbnTestServer'),
      serverArgs: [
        ...kibanaCommonConfig.get('kbnTestServer.serverArgs'),
        `--plugin-path=${samlIdPPlugin}`,
        `--plugin-path=${testEndpointsPlugin}`,
        '--server.uuid=5b2de169-2785-441b-ae8c-186a1936b17d',
        '--server.restrictInternalApis=false',
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
            saml_never: {
              order: 4,
              realm: 'saml_never',
              description: 'Never-log-in-with-SAML',
              icon: 'logoKibana',
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
    screenshots: { directory: resolve(__dirname, 'screenshots') },

    junit: {
      reportName: 'Chrome X-Pack Security Functional Tests (Login Selector)',
    },
  };
}
