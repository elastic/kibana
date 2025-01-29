/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolve } from 'path';
import { format as formatUrl } from 'url';
import Fs from 'fs';

import { REPO_ROOT } from '@kbn/repo-info';
import {
  esTestConfig,
  kbnTestConfig,
  kibanaTestSuperuserServerless,
  getDockerFileMountPath,
} from '@kbn/test';
import { CA_CERT_PATH, kibanaDevServiceAccount } from '@kbn/dev-utils';
import { commonFunctionalServices } from '@kbn/ftr-common-functional-services';
import { MOCK_IDP_REALM_NAME } from '@kbn/mock-idp-utils';
import path from 'path';
import { fleetPackageRegistryDockerImage, defineDockerServersConfig } from '@kbn/test';
import { services } from './services';

export default async () => {
  const packageRegistryConfig = path.join(__dirname, './common/package_registry_config.yml');
  const dockerArgs: string[] = ['-v', `${packageRegistryConfig}:/package-registry/config.yml`];

  /**
   * This is used by CI to set the docker registry port
   * you can also define this environment variable locally when running tests which
   * will spin up a local docker package registry locally for you
   * if this is defined it takes precedence over the `packageRegistryOverride` variable
   */
  const dockerRegistryPort: string | undefined = process.env.FLEET_PACKAGE_REGISTRY_PORT;

  const servers = {
    kibana: {
      ...kbnTestConfig.getUrlParts(kibanaTestSuperuserServerless),
      protocol: process.env.TEST_CLOUD ? 'https' : 'http',
      certificateAuthorities: process.env.TEST_CLOUD ? undefined : [Fs.readFileSync(CA_CERT_PATH)],
    },
    elasticsearch: {
      ...esTestConfig.getUrlParts(),
      protocol: 'https',
      certificateAuthorities: process.env.TEST_CLOUD ? undefined : [Fs.readFileSync(CA_CERT_PATH)],
    },
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
    dockerServers: defineDockerServersConfig({
      registry: {
        enabled: !!dockerRegistryPort,
        image: fleetPackageRegistryDockerImage,
        portInContainer: 8080,
        port: dockerRegistryPort,
        args: dockerArgs,
        waitForLogLine: 'package manifests loaded',
        waitForLogLineTimeoutMs: 60 * 2 * 1000, // 2 minutes
      },
    }),
    browser: {
      acceptInsecureCerts: true,
    },
    esTestCluster: {
      from: 'serverless',
      files: [idpPath, jwksPath],
      serverArgs: [
        'xpack.security.authc.realms.file.file1.order=-100',
        `xpack.security.authc.realms.native.native1.enabled=false`,
        `xpack.security.authc.realms.native.native1.order=-97`,

        'xpack.security.authc.realms.jwt.jwt1.allowed_audiences=elasticsearch',
        `xpack.security.authc.realms.jwt.jwt1.allowed_issuer=https://kibana.elastic.co/jwt/`,
        `xpack.security.authc.realms.jwt.jwt1.allowed_signature_algorithms=[RS256]`,
        `xpack.security.authc.realms.jwt.jwt1.allowed_subjects=elastic-agent`,
        `xpack.security.authc.realms.jwt.jwt1.claims.principal=sub`,
        'xpack.security.authc.realms.jwt.jwt1.client_authentication.type=shared_secret',
        'xpack.security.authc.realms.jwt.jwt1.order=-98',
        `xpack.security.authc.realms.jwt.jwt1.pkc_jwkset_path=${getDockerFileMountPath(jwksPath)}`,
        `xpack.security.authc.realms.jwt.jwt1.token_type=access_token`,
        'serverless.indices.validate_dot_prefixes=true',
        // controller cluster-settings
        `cluster.service.slow_task_logging_threshold=15s`,
        `cluster.service.slow_task_thread_dump_timeout=5s`,
        `serverless.search.enable_replicas_for_instant_failover=true`,
      ],
      ssl: true, // SSL is required for SAML realm
    },

    kbnTestServer: {
      buildArgs: [],
      env: {
        KBN_PATH_CONF: resolve(REPO_ROOT, 'config'),
      },
      sourceArgs: ['--no-base-path', '--env.name=development'],
      serverArgs: [
        `--server.restrictInternalApis=true`,
        `--server.port=${servers.kibana.port}`,
        `--server.prototypeHardening=true`,
        '--status.allowAnonymous=true',
        `--migrations.zdt.runOnRoles=${JSON.stringify(['ui'])}`,
        // We shouldn't embed credentials into the URL since Kibana requests to Elasticsearch should
        // either include `kibanaServerTestUser` credentials, or credentials provided by the test
        // user, or none at all in case anonymous access is used.
        `--elasticsearch.hosts=${formatUrl(
          Object.fromEntries(
            Object.entries(servers.elasticsearch).filter(([key]) => key.toLowerCase() !== 'auth')
          )
        )}`,
        `--elasticsearch.serviceAccountToken=${kibanaDevServiceAccount.token}`,
        `--elasticsearch.ssl.certificateAuthorities=${CA_CERT_PATH}`,
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
        // Add meta info to the logs so FTR logs are more actionable
        `--logging.appenders.default=${JSON.stringify({
          type: 'console',
          layout: {
            type: 'pattern',
            pattern: '[%date][%level][%logger] %message %meta',
          },
        })}`,
        `--logging.appenders.console=${JSON.stringify({
          type: 'console',
          layout: {
            type: 'pattern',
            pattern: '[%date][%level][%logger] %message %meta',
          },
        })}`,
        // This ensures that we register the Security SAML API endpoints.
        // In the real world the SAML config is injected by control plane.
        `--plugin-path=${samlIdPPlugin}`,
        // Ensure that SAML is used as the default authentication method whenever a user navigates to Kibana. In other
        // words, Kibana should attempt to authenticate the user using the provider with the lowest order if the Login
        // Selector is disabled (which is how Serverless Kibana is configured). By declaring `cloud-basic` with a higher
        // order, we indicate that basic authentication can still be used, but only if explicitly requested when the
        // user navigates to `/login` page directly and enters username and password in the login form.
        '--xpack.security.authc.selector.enabled=false',
        `--xpack.security.authc.providers=${JSON.stringify({
          saml: { 'cloud-saml-kibana': { order: 0, realm: MOCK_IDP_REALM_NAME } },
          basic: { 'cloud-basic': { order: 1 } },
        })}`,
        '--xpack.encryptedSavedObjects.encryptionKey="wuGNaIhoMpk5sO4UBxgr3NyW1sFcLgIf"',
        `--server.publicBaseUrl=${servers.kibana.protocol}://${servers.kibana.hostname}:${servers.kibana.port}`,
        // configure security reponse header report-to settings to mimic MKI configuration
        `--csp.report_to=${JSON.stringify(['violations-endpoint'])}`,
        `--permissionsPolicy.report_to=${JSON.stringify(['violations-endpoint'])}`,
        // normally below is injected by control plane
        '--xpack.cloud.id=ftr_fake_cloud_id',
        `--xpack.cloud.serverless.project_id=fakeprojectid`,
        `--xpack.cloud.base_url=https://fake-cloud.elastic.co`,
        `--xpack.cloud.projects_url=/projects/`,
        `--xpack.cloud.profile_url=/user/settings/`,
        `--xpack.cloud.billing_url=/billing/overview/`,
        `--xpack.cloud.deployments_url=/deployments`,
        `--xpack.cloud.organization_url=/account/`,
        `--xpack.cloud.users_and_roles_url=/account/members/`,
      ],
    },

    security: { disableTestUser: true },

    // Used by FTR to recognize serverless project and change its behavior accordingly
    serverless: true,

    services: {
      ...commonFunctionalServices,
      ...services,
    },

    // overriding default timeouts from packages/kbn-test/src/functional_test_runner/lib/config/schema.ts
    // so we can easily adjust them for serverless where needed
    timeouts: {
      find: 10 * 1000,
      try: 120 * 1000,
      waitFor: 20 * 1000,
      esRequestTimeout: 30 * 1000,
      kibanaReportCompletion: 600 * 1000,
      kibanaStabilize: 15 * 1000,
      navigateStatusPageCheck: 250,
      waitForExists: 2500,
    },
  };
};
