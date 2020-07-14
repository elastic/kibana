/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import { CA_CERT_PATH, KBN_CERT_PATH, KBN_KEY_PATH } from '@kbn/dev-utils';
import { FtrConfigProviderContext } from '@kbn/test/types/ftr';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const kibanaAPITestsConfig = await readConfigFile(
    require.resolve('../../../test/api_integration/config.js')
  );
  const xPackAPITestsConfig = await readConfigFile(require.resolve('../api_integration/config.ts'));
  const kibanaPort = xPackAPITestsConfig.get('servers.kibana.port');

  const kerberosKeytabPath = resolve(__dirname, '../kerberos_api_integration/fixtures/krb5.keytab');
  const kerberosConfigPath = resolve(__dirname, '../kerberos_api_integration/fixtures/krb5.conf');

  const oidcJWKSPath = resolve(__dirname, '../oidc_api_integration/fixtures/jwks.json');
  const oidcIdPPlugin = resolve(__dirname, '../oidc_api_integration/fixtures/oidc_provider');

  const pkiKibanaCAPath = resolve(__dirname, '../pki_api_integration/fixtures/kibana_ca.crt');

  const saml1IdPMetadataPath = resolve(
    __dirname,
    '../saml_api_integration/fixtures/idp_metadata.xml'
  );
  const saml2IdPMetadataPath = resolve(
    __dirname,
    '../saml_api_integration/fixtures/idp_metadata_2.xml'
  );

  const servers = {
    ...xPackAPITestsConfig.get('servers'),
    elasticsearch: {
      ...xPackAPITestsConfig.get('servers.elasticsearch'),
      protocol: 'https',
    },
    kibana: {
      ...xPackAPITestsConfig.get('servers.kibana'),
      protocol: 'https',
    },
  };

  return {
    testFiles: [require.resolve('./apis')],
    servers,
    security: { disableTestUser: true },
    services: {
      randomness: kibanaAPITestsConfig.get('services.randomness'),
      legacyEs: kibanaAPITestsConfig.get('services.legacyEs'),
      supertestWithoutAuth: xPackAPITestsConfig.get('services.supertestWithoutAuth'),
    },
    junit: {
      reportName: 'X-Pack Login Selector API Integration Tests',
    },

    esTestCluster: {
      ...xPackAPITestsConfig.get('esTestCluster'),
      ssl: true,
      serverArgs: [
        ...xPackAPITestsConfig.get('esTestCluster.serverArgs'),
        'xpack.security.authc.token.enabled=true',
        'xpack.security.authc.token.timeout=15s',
        'xpack.security.http.ssl.client_authentication=optional',
        'xpack.security.http.ssl.verification_mode=certificate',
        'xpack.security.authc.realms.native.native1.order=0',
        'xpack.security.authc.realms.kerberos.kerb1.order=1',
        `xpack.security.authc.realms.kerberos.kerb1.keytab.path=${kerberosKeytabPath}`,
        'xpack.security.authc.realms.pki.pki1.order=2',
        'xpack.security.authc.realms.pki.pki1.delegation.enabled=true',
        `xpack.security.authc.realms.pki.pki1.certificate_authorities=${CA_CERT_PATH}`,
        'xpack.security.authc.realms.saml.saml1.order=3',
        `xpack.security.authc.realms.saml.saml1.idp.metadata.path=${saml1IdPMetadataPath}`,
        'xpack.security.authc.realms.saml.saml1.idp.entity_id=http://www.elastic.co/saml1',
        `xpack.security.authc.realms.saml.saml1.sp.entity_id=http://localhost:${kibanaPort}`,
        `xpack.security.authc.realms.saml.saml1.sp.logout=http://localhost:${kibanaPort}/logout`,
        `xpack.security.authc.realms.saml.saml1.sp.acs=http://localhost:${kibanaPort}/api/security/saml/callback`,
        'xpack.security.authc.realms.saml.saml1.attributes.principal=urn:oid:0.0.7',
        'xpack.security.authc.realms.oidc.oidc1.order=4',
        `xpack.security.authc.realms.oidc.oidc1.rp.client_id=0oa8sqpov3TxMWJOt356`,
        `xpack.security.authc.realms.oidc.oidc1.rp.client_secret=0oa8sqpov3TxMWJOt356`,
        `xpack.security.authc.realms.oidc.oidc1.rp.response_type=code`,
        `xpack.security.authc.realms.oidc.oidc1.rp.redirect_uri=https://localhost:${kibanaPort}/api/security/oidc/callback`,
        `xpack.security.authc.realms.oidc.oidc1.op.authorization_endpoint=https://test-op.elastic.co/oauth2/v1/authorize`,
        `xpack.security.authc.realms.oidc.oidc1.op.endsession_endpoint=https://test-op.elastic.co/oauth2/v1/endsession`,
        `xpack.security.authc.realms.oidc.oidc1.op.token_endpoint=https://localhost:${kibanaPort}/api/oidc_provider/token_endpoint`,
        `xpack.security.authc.realms.oidc.oidc1.op.userinfo_endpoint=https://localhost:${kibanaPort}/api/oidc_provider/userinfo_endpoint`,
        `xpack.security.authc.realms.oidc.oidc1.op.issuer=https://test-op.elastic.co`,
        `xpack.security.authc.realms.oidc.oidc1.op.jwkset_path=${oidcJWKSPath}`,
        `xpack.security.authc.realms.oidc.oidc1.claims.principal=sub`,
        `xpack.security.authc.realms.oidc.oidc1.ssl.certificate_authorities=${CA_CERT_PATH}`,
        'xpack.security.authc.realms.saml.saml2.order=5',
        `xpack.security.authc.realms.saml.saml2.idp.metadata.path=${saml2IdPMetadataPath}`,
        'xpack.security.authc.realms.saml.saml2.idp.entity_id=http://www.elastic.co/saml2',
        `xpack.security.authc.realms.saml.saml2.sp.entity_id=http://localhost:${kibanaPort}`,
        `xpack.security.authc.realms.saml.saml2.sp.logout=http://localhost:${kibanaPort}/logout`,
        `xpack.security.authc.realms.saml.saml2.sp.acs=http://localhost:${kibanaPort}/api/security/saml/callback`,
        'xpack.security.authc.realms.saml.saml2.attributes.principal=urn:oid:0.0.7',
      ],
      serverEnvVars: {
        // We're going to use the same TGT multiple times and during a short period of time, so we
        // have to disable replay cache so that ES doesn't complain about that.
        ES_JAVA_OPTS: `-Djava.security.krb5.conf=${kerberosConfigPath} -Dsun.security.krb5.rcache=none`,
      },
    },

    kbnTestServer: {
      ...xPackAPITestsConfig.get('kbnTestServer'),
      serverArgs: [
        ...xPackAPITestsConfig.get('kbnTestServer.serverArgs'),
        `--plugin-path=${oidcIdPPlugin}`,
        '--optimize.enabled=false',
        '--server.ssl.enabled=true',
        `--server.ssl.key=${KBN_KEY_PATH}`,
        `--server.ssl.certificate=${KBN_CERT_PATH}`,
        `--server.ssl.certificateAuthorities=${JSON.stringify([CA_CERT_PATH, pkiKibanaCAPath])}`,
        `--server.ssl.clientAuthentication=optional`,
        `--elasticsearch.hosts=${servers.elasticsearch.protocol}://${servers.elasticsearch.hostname}:${servers.elasticsearch.port}`,
        `--elasticsearch.ssl.certificateAuthorities=${CA_CERT_PATH}`,
        `--xpack.security.authc.providers=${JSON.stringify({
          basic: { basic1: { order: 0 } },
          kerberos: { kerberos1: { order: 4 } },
          pki: { pki1: { order: 2 } },
          oidc: { oidc1: { order: 3, realm: 'oidc1' } },
          saml: {
            saml1: { order: 1, realm: 'saml1' },
            saml2: {
              order: 5,
              realm: 'saml2',
              maxRedirectURLSize: '100b',
              useRelayStateDeepLink: true,
            },
          },
        })}`,
      ],
    },
  };
}
