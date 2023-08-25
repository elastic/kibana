/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolve } from 'path';
import { format as formatUrl } from 'url';

import { REPO_ROOT } from '@kbn/repo-info';
import {
  esTestConfig,
  kbnTestConfig,
  kibanaServiceAccount,
  kibanaServerlessSuperuser,
  getDockerFileMountPath,
} from '@kbn/test';
import { CA_CERT_PATH, KBN_CERT_PATH, KBN_KEY_PATH } from '@kbn/dev-utils';
import { commonFunctionalServices } from '@kbn/ftr-common-functional-services';

export default async () => {
  const servers = {
    kibana: {
      ...kbnTestConfig.getUrlParts(kibanaServerlessSuperuser),
      protocol: 'https',
    },
    elasticsearch: { ...esTestConfig.getUrlParts(), protocol: 'https' },
  };

  // "Fake" SAML provider
  const idpPath = resolve(
    __dirname,
    '../../test/security_api_integration/plugins/saml_provider/metadata.xml'
  );
  const samlIdPPlugin = resolve(
    __dirname,
    '../../test/security_api_integration/plugins/saml_provider'
  );

  const jwksPath = require.resolve('@kbn/security-api-integration-helpers/oidc/jwks.json');

  return {
    servers,
    browser: {
      acceptInsecureCerts: true,
    },
    esTestCluster: {
      from: 'serverless',
      files: [idpPath],
      serverArgs: [
        'xpack.security.authc.realms.file.file1.order=-100',

        'xpack.security.authc.realms.jwt.jwt1.order=-98',
        `xpack.security.authc.realms.jwt.jwt1.token_type=access_token`,
        'xpack.security.authc.realms.jwt.jwt1.client_authentication.type=shared_secret',
        `xpack.security.authc.realms.jwt.jwt1.client_authentication.shared_secret=my_super_secret`,
        `xpack.security.authc.realms.jwt.jwt1.allowed_issuer=https://kibana.elastic.co/jwt/`,
        `xpack.security.authc.realms.jwt.jwt1.allowed_subjects=elastic-agent`,
        'xpack.security.authc.realms.jwt.jwt1.allowed_audiences=elasticsearch',
        `xpack.security.authc.realms.jwt.jwt1.allowed_signature_algorithms=[RS256]`,
        `xpack.security.authc.realms.jwt.jwt1.claims.principal=sub`,
        `xpack.security.authc.realms.jwt.jwt1.pkc_jwkset_path=${jwksPath}`,

        // TODO: We should set this flag to `false` as soon as we fully migrate tests to SAML and file realms.
        `xpack.security.authc.realms.native.native1.enabled=true`,
        `xpack.security.authc.realms.native.native1.order=-97`,
        'xpack.security.authc.token.enabled=true',
        'xpack.security.authc.realms.saml.cloud-saml-kibana.order=0',
        `xpack.security.authc.realms.saml.cloud-saml-kibana.idp.metadata.path=${getDockerFileMountPath(
          idpPath
        )}`,
        'xpack.security.authc.realms.saml.cloud-saml-kibana.idp.entity_id=http://www.elastic.co/saml1',
        `xpack.security.authc.realms.saml.cloud-saml-kibana.sp.entity_id=http://localhost:${servers.kibana.port}`,
        `xpack.security.authc.realms.saml.cloud-saml-kibana.sp.logout=http://localhost:${servers.kibana.port}/logout`,
        `xpack.security.authc.realms.saml.cloud-saml-kibana.sp.acs=http://localhost:${servers.kibana.port}/api/security/saml/callback`,
        'xpack.security.authc.realms.saml.cloud-saml-kibana.attributes.principal=urn:oid:0.0.7',
      ],
    },

    kbnTestServer: {
      buildArgs: [],
      env: {
        KBN_PATH_CONF: resolve(REPO_ROOT, 'config'),
      },
      sourceArgs: ['--no-base-path', '--env.name=development'],
      serverArgs: [
        '--server.ssl.enabled=true',
        `--server.ssl.key=${KBN_KEY_PATH}`,
        `--server.ssl.certificate=${KBN_CERT_PATH}`,
        `--server.ssl.certificateAuthorities=${CA_CERT_PATH}`,
        `--server.restrictInternalApis=true`,
        `--server.port=${servers.kibana.port}`,
        '--status.allowAnonymous=true',
        // We shouldn't embed credentials into the URL since Kibana requests to Elasticsearch should
        // either include `kibanaServerTestUser` credentials, or credentials provided by the test
        // user, or none at all in case anonymous access is used.
        `--elasticsearch.hosts=${formatUrl(
          Object.fromEntries(
            Object.entries(servers.elasticsearch).filter(([key]) => key.toLowerCase() !== 'auth')
          )
        )}`,
        `--elasticsearch.serviceAccountToken=${kibanaServiceAccount.token}`,
        '--telemetry.sendUsageTo=staging',
        `--logging.appenders.deprecation=${JSON.stringify({
          type: 'console',
          layout: {
            type: 'json',
          },
        })}`,
        `--logging.loggers=${JSON.stringify([
          {
            name: 'elasticsearch.deprecation',
            level: 'all',
            appenders: ['deprecation'],
          },
        ])}`,
        // This ensures that we register the Security SAML API endpoints.
        // In the real world the SAML config is injected by control plane.
        // basic: { 'basic': { order: 0 } },
        `--plugin-path=${samlIdPPlugin}`,
        '--xpack.cloud.id=ftr_fake_cloud_id',
        '--xpack.security.authc.selector.enabled=false',
        `--xpack.security.authc.providers=${JSON.stringify({
          basic: { basic: { order: 0 } },
          saml: { 'cloud-saml-kibana': { order: 1, realm: 'cloud-saml-kibana' } },
        })}`,
        '--xpack.encryptedSavedObjects.encryptionKey="wuGNaIhoMpk5sO4UBxgr3NyW1sFcLgIf"',
        `--server.publicBaseUrl=${servers.kibana.protocol}://${servers.kibana.hostname}:${servers.kibana.port}`,
      ],
    },

    security: { disableTestUser: true },

    // Used by FTR to recognize serverless project and change its behavior accordingly
    serverless: true,

    services: {
      ...commonFunctionalServices,
    },

    // overriding default timeouts from packages/kbn-test/src/functional_test_runner/lib/config/schema.ts
    // so we can easily adjust them for serverless where needed
    timeouts: {
      find: 10 * 1000,
      try: 120 * 1000,
      waitFor: 20 * 1000,
      esRequestTimeout: 30 * 1000,
      kibanaReportCompletion: 60 * 1000,
      kibanaStabilize: 15 * 1000,
      navigateStatusPageCheck: 250,
      waitForExists: 2500,
    },
  };
};
