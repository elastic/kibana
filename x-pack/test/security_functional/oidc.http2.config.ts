/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';
import { CA_CERT_PATH } from '@kbn/dev-utils';
import { configureHTTP2 } from '@kbn/test-suites-src/common/configure_http2';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const kibanaFunctionalConfig = await readConfigFile(
    require.resolve('@kbn/test-suites-src/functional/config.base')
  );
  const functionalConfig = await readConfigFile(require.resolve('./oidc.config'));
  const kibanaPort = kibanaFunctionalConfig.get('servers.kibana.port');
  const jwksPath = require.resolve('@kbn/security-api-integration-helpers/oidc/jwks.json');

  return configureHTTP2({
    ...functionalConfig.getAll(),
    esTestCluster: {
      license: 'trial',
      from: 'snapshot',
      serverArgs: [
        'xpack.security.authc.token.enabled=true',
        'xpack.security.authc.realms.oidc.oidc1.order=0',
        `xpack.security.authc.realms.oidc.oidc1.rp.client_id=0oa8sqpov3TxMWJOt356`,
        `xpack.security.authc.realms.oidc.oidc1.rp.client_secret=0oa8sqpov3TxMWJOt356`,
        `xpack.security.authc.realms.oidc.oidc1.rp.response_type=code`,
        `xpack.security.authc.realms.oidc.oidc1.rp.redirect_uri=https://localhost:${kibanaPort}/api/security/oidc/callback`,
        `xpack.security.authc.realms.oidc.oidc1.rp.post_logout_redirect_uri=https://localhost:${kibanaPort}/security/logged_out`,
        `xpack.security.authc.realms.oidc.oidc1.op.authorization_endpoint=https://localhost:${kibanaPort}/oidc_provider/authorize`,
        `xpack.security.authc.realms.oidc.oidc1.op.endsession_endpoint=https://localhost:${kibanaPort}/oidc_provider/endsession`,
        `xpack.security.authc.realms.oidc.oidc1.op.token_endpoint=https://localhost:${kibanaPort}/api/oidc_provider/token_endpoint`,
        `xpack.security.authc.realms.oidc.oidc1.op.userinfo_endpoint=https://localhost:${kibanaPort}/api/oidc_provider/userinfo_endpoint`,
        `xpack.security.authc.realms.oidc.oidc1.op.issuer=https://test-op.elastic.co`,
        `xpack.security.authc.realms.oidc.oidc1.op.jwkset_path=${jwksPath}`,
        `xpack.security.authc.realms.oidc.oidc1.claims.principal=sub`,
        `xpack.security.authc.realms.oidc.oidc1.ssl.certificate_authorities=${CA_CERT_PATH}`,
      ],
    },
    junit: {
      reportName: 'Chrome X-Pack Security Functional Tests HTTP/2 (OpenID Connect)',
    },
  });
}
