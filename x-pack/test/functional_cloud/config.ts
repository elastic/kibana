/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { resolve } from 'path';
import { FtrConfigProviderContext } from '@kbn/test';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const functionalConfig = await readConfigFile(require.resolve('../functional/config.base.js'));

  const kibanaPort = functionalConfig.get('servers.kibana.port');
  const idpPath = resolve(
    __dirname,
    '../security_api_integration/plugins/saml_provider/metadata.xml'
  );
  const samlIdPPlugin = resolve(__dirname, '../security_api_integration/plugins/saml_provider');

  return {
    ...functionalConfig.getAll(),
    rootTags: ['skipCloud'],
    testFiles: [require.resolve('./tests')],
    security: { disableTestUser: true },
    junit: {
      reportName: 'Cloud Integrations Functional Tests',
    },
    esTestCluster: {
      ...functionalConfig.get('esTestCluster'),
      serverArgs: [
        ...functionalConfig.get('esTestCluster.serverArgs'),
        'xpack.security.authc.token.enabled=true',
        'xpack.security.authc.realms.saml.cloud-saml-kibana.order=0',
        `xpack.security.authc.realms.saml.cloud-saml-kibana.idp.metadata.path=${idpPath}`,
        'xpack.security.authc.realms.saml.cloud-saml-kibana.idp.entity_id=http://www.elastic.co/saml1',
        `xpack.security.authc.realms.saml.cloud-saml-kibana.sp.entity_id=http://localhost:${kibanaPort}`,
        `xpack.security.authc.realms.saml.cloud-saml-kibana.sp.logout=http://localhost:${kibanaPort}/logout`,
        `xpack.security.authc.realms.saml.cloud-saml-kibana.sp.acs=http://localhost:${kibanaPort}/api/security/saml/callback`,
        'xpack.security.authc.realms.saml.cloud-saml-kibana.attributes.principal=urn:oid:0.0.7',
      ],
    },
    kbnTestServer: {
      ...functionalConfig.get('kbnTestServer'),
      serverArgs: [
        ...functionalConfig.get('kbnTestServer.serverArgs'),
        `--plugin-path=${samlIdPPlugin}`,
        // Note: the base64 string in the cloud.id config contains the ES endpoint required in the functional tests
        '--xpack.cloud.id=ftr_fake_cloud_id:aGVsbG8uY29tOjQ0MyRFUzEyM2FiYyRrYm4xMjNhYmM=',
        '--xpack.cloud.base_url=https://cloud.elastic.co',
        '--xpack.cloud.deployment_url=/deployments/deploymentId',
        '--xpack.cloud.organization_url=/organization/organizationId',
        '--xpack.cloud.billing_url=/billing',
        '--xpack.cloud.profile_url=/user/userId',
        '--xpack.security.authc.selector.enabled=false',
        `--xpack.security.authc.providers=${JSON.stringify({
          basic: { 'cloud-basic': { order: 1 } },
          saml: { 'cloud-saml-kibana': { order: 0, realm: 'cloud-saml-kibana' } },
        })}`,
      ],
    },
  };
}
