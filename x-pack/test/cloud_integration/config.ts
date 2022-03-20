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

const FULLSTORY_ORG_ID = process.env.FULLSTORY_ORG_ID;
const FULLSTORY_API_KEY = process.env.FULLSTORY_API_KEY;
const RUN_FULLSTORY_TESTS = Boolean(FULLSTORY_ORG_ID && FULLSTORY_API_KEY);

const CHAT_URL = process.env.CHAT_URL;
const CHAT_IDENTITY_SECRET = process.env.CHAT_IDENTITY_SECRET;
const RUN_CHAT_TESTS = Boolean(CHAT_URL);

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
  const idpPath = resolve(__dirname, './fixtures/saml/saml_provider/metadata.xml');
  const samlIdPPlugin = resolve(__dirname, './fixtures/saml/saml_provider');

  return {
    testFiles: [
      ...(RUN_FULLSTORY_TESTS ? [resolve(__dirname, './tests/fullstory')] : []),
      ...(RUN_CHAT_TESTS ? [resolve(__dirname, './tests/chat')] : []),
      ...(!RUN_CHAT_TESTS ? [resolve(__dirname, './tests/chat_disabled')] : []),
    ],

    services,
    pageObjects,

    servers: kibanaFunctionalConfig.get('servers'),

    esTestCluster: {
      license: 'trial',
      from: 'snapshot',
      serverArgs: [
        'xpack.security.authc.token.enabled=true',
        'xpack.security.authc.realms.saml.saml1.order=0',
        `xpack.security.authc.realms.saml.saml1.idp.metadata.path=${idpPath}`,
        'xpack.security.authc.realms.saml.saml1.idp.entity_id=http://www.elastic.co/saml1',
        `xpack.security.authc.realms.saml.saml1.sp.entity_id=http://localhost:${kibanaPort}`,
        `xpack.security.authc.realms.saml.saml1.sp.logout=http://localhost:${kibanaPort}/logout`,
        `xpack.security.authc.realms.saml.saml1.sp.acs=http://localhost:${kibanaPort}/api/security/saml/callback`,
        'xpack.security.authc.realms.saml.saml1.attributes.principal=http://saml.elastic-cloud.com/attributes/principal',
        'xpack.security.authc.realms.saml.saml1.attributes.groups=http://saml.elastic-cloud.com/attributes/roles',
      ],
    },

    kbnTestServer: {
      ...kibanaCommonConfig.get('kbnTestServer'),
      serverArgs: [
        ...kibanaCommonConfig.get('kbnTestServer.serverArgs'),
        `--plugin-path=${samlIdPPlugin}`,
        '--server.uuid=5b2de169-2785-441b-ae8c-186a1936b17d',
        '--xpack.security.encryptionKey="wuGNaIhoMpk5sO4UBxgr3NyW1sFcLgIf"',
        '--xpack.security.authc.selector.enabled=false',
        '--xpack.security.authc.providers.saml.saml1.order=0',
        '--xpack.security.authc.providers.saml.saml1.realm=saml1',
        '--xpack.security.authc.providers.basic.basic1.order=1',
        ...(RUN_FULLSTORY_TESTS
          ? [
              '--xpack.cloud.full_story.enabled=true',
              `--xpack.cloud.full_story.org_id=${FULLSTORY_ORG_ID}`,
            ]
          : []),
        ...(RUN_CHAT_TESTS
          ? [
              '--xpack.cloud.id=5b2de169-2785-441b-ae8c-186a1936b17d',
              '--xpack.cloud.chat.enabled=true',
              `--xpack.cloud.chat.chatURL=${CHAT_URL}`,
              `--xpack.cloud.chatIdentitySecret=${CHAT_IDENTITY_SECRET}`,
            ]
          : []),
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
      reportName: 'Chrome X-Pack Cloud Integration Functional Tests (SAML)',
    },
  };
}
