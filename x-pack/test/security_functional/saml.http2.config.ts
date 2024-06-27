/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolve } from 'path';
import { FtrConfigProviderContext } from '@kbn/test';
import { CA_CERT_PATH } from '@kbn/dev-utils';
import { configureHTTP2 } from '../../../test/common/configure_http2';

// the default export of config files must be a config provider
// that returns an object with the projects config values
export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const functionalConfig = await readConfigFile(require.resolve('./saml.config'));
  const kibanaFunctionalConfig = await readConfigFile(
    require.resolve('../../../test/functional/config.base.js')
  );

  const kibanaPort = kibanaFunctionalConfig.get('servers.kibana.port');
  const idpPath = resolve(
    __dirname,
    '../security_api_integration/plugins/saml_provider/metadata.xml'
  );

  return configureHTTP2({
    ...functionalConfig.getAll(),
    esTestCluster: {
      license: 'trial',
      from: 'snapshot',
      serverArgs: [
        'xpack.security.authc.token.enabled=true',
        'xpack.security.authc.realms.saml.saml1.order=0',
        `xpack.security.authc.realms.saml.saml1.idp.metadata.path=${idpPath}`,
        'xpack.security.authc.realms.saml.saml1.idp.entity_id=http://www.elastic.co/saml1',
        `xpack.security.authc.realms.saml.saml1.sp.entity_id=https://localhost:${kibanaPort}`,
        `xpack.security.authc.realms.saml.saml1.sp.logout=https://localhost:${kibanaPort}/logout`,
        `xpack.security.authc.realms.saml.saml1.sp.acs=https://localhost:${kibanaPort}/api/security/saml/callback`,
        'xpack.security.authc.realms.saml.saml1.attributes.principal=urn:oid:0.0.7',
        `xpack.security.authc.realms.saml.saml1.ssl.certificate_authorities=${CA_CERT_PATH}`,
      ],
    },
    junit: {
      reportName: 'Chrome X-Pack Security Functional Tests HTTP/2 (SAML)',
    },
  });
}
