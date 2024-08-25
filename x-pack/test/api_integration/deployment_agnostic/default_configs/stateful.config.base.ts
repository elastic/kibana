/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  MOCK_IDP_REALM_NAME,
  MOCK_IDP_ENTITY_ID,
  MOCK_IDP_ATTRIBUTE_PRINCIPAL,
  MOCK_IDP_ATTRIBUTE_ROLES,
  MOCK_IDP_ATTRIBUTE_EMAIL,
  MOCK_IDP_ATTRIBUTE_NAME,
} from '@kbn/mock-idp-utils';
import {
  esTestConfig,
  kbnTestConfig,
  systemIndicesSuperuser,
  FtrConfigProviderContext,
} from '@kbn/test';
import path from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import { STATEFUL_ROLES_ROOT_PATH } from '@kbn/es';
import { DeploymentAgnosticCommonServices, services } from '../services';

interface CreateTestConfigOptions<T extends DeploymentAgnosticCommonServices> {
  esServerArgs?: string[];
  kbnServerArgs?: string[];
  services?: T;
  testFiles: string[];
  junit: { reportName: string };
  suiteTags?: { include?: string[]; exclude?: string[] };
}

export function createStatefulTestConfig<T extends DeploymentAgnosticCommonServices>(
  options: CreateTestConfigOptions<T>
) {
  return async ({ readConfigFile }: FtrConfigProviderContext) => {
    if (options.esServerArgs || options.kbnServerArgs) {
      throw new Error(
        `FTR doesn't provision custom ES/Kibana server arguments into the ESS deployment.
  It may lead to unexpected test failures on Cloud. Please contact #appex-qa.`
      );
    }

    const xPackAPITestsConfig = await readConfigFile(require.resolve('../../config.ts'));

    // TODO: move to kbn-es because currently metadata file has hardcoded entityID and Location
    const idpPath = require.resolve(
      '@kbn/security-api-integration-helpers/saml/idp_metadata_mock_idp.xml'
    );

    const servers = {
      kibana: {
        ...kbnTestConfig.getUrlParts(systemIndicesSuperuser),
        protocol: process.env.TEST_CLOUD ? 'https' : 'http',
      },
      elasticsearch: {
        ...esTestConfig.getUrlParts(),
        protocol: process.env.TEST_CLOUD ? 'https' : 'http',
      },
    };

    const kbnUrl = `${servers.kibana.protocol}://${servers.kibana.hostname}:${servers.kibana.port}`;

    return {
      servers,
      testFiles: options.testFiles,
      security: { disableTestUser: true },
      // services can be customized, but must extend DeploymentAgnosticCommonServices
      services: options.services || services,
      junit: options.junit,
      suiteTags: options.suiteTags,

      esTestCluster: {
        ...xPackAPITestsConfig.get('esTestCluster'),
        serverArgs: [
          ...xPackAPITestsConfig.get('esTestCluster.serverArgs'),
          'xpack.security.authc.token.enabled=true',
          `xpack.security.authc.realms.saml.${MOCK_IDP_REALM_NAME}.order=0`,
          `xpack.security.authc.realms.saml.${MOCK_IDP_REALM_NAME}.idp.metadata.path=${idpPath}`,
          `xpack.security.authc.realms.saml.${MOCK_IDP_REALM_NAME}.idp.entity_id=${MOCK_IDP_ENTITY_ID}`,
          `xpack.security.authc.realms.saml.${MOCK_IDP_REALM_NAME}.sp.entity_id=${kbnUrl}`,
          `xpack.security.authc.realms.saml.${MOCK_IDP_REALM_NAME}.sp.acs=${kbnUrl}/api/security/saml/callback`,
          `xpack.security.authc.realms.saml.${MOCK_IDP_REALM_NAME}.sp.logout=${kbnUrl}/logout`,
          `xpack.security.authc.realms.saml.${MOCK_IDP_REALM_NAME}.attributes.principal=${MOCK_IDP_ATTRIBUTE_PRINCIPAL}`,
          `xpack.security.authc.realms.saml.${MOCK_IDP_REALM_NAME}.attributes.groups=${MOCK_IDP_ATTRIBUTE_ROLES}`,
          `xpack.security.authc.realms.saml.${MOCK_IDP_REALM_NAME}.attributes.name=${MOCK_IDP_ATTRIBUTE_NAME}`,
          `xpack.security.authc.realms.saml.${MOCK_IDP_REALM_NAME}.attributes.mail=${MOCK_IDP_ATTRIBUTE_EMAIL}`,
        ],
        files: [
          // Passing the roles that are equivalent to the ones we have in serverless
          path.resolve(REPO_ROOT, STATEFUL_ROLES_ROOT_PATH, 'roles.yml'),
        ],
      },

      kbnTestServer: {
        ...xPackAPITestsConfig.get('kbnTestServer'),
        serverArgs: [
          ...xPackAPITestsConfig.get('kbnTestServer.serverArgs'),
          '--xpack.security.authc.selector.enabled=false',
          `--xpack.security.authc.providers=${JSON.stringify({
            saml: { 'cloud-saml-kibana': { order: 0, realm: MOCK_IDP_REALM_NAME } },
            basic: { 'cloud-basic': { order: 1 } },
          })}`,
          `--server.publicBaseUrl=${servers.kibana.protocol}://${servers.kibana.hostname}:${servers.kibana.port}`,
        ],
      },
    };
  };
}
