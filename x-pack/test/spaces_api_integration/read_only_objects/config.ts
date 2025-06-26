/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolve } from 'path';

import type { FtrConfigProviderContext } from '@kbn/test';

import { services as apiIntegrationServices } from '../../api_integration/services';
import { services as commonServices } from '../../common/services';

export const services = {
  ...commonServices,
  esSupertest: apiIntegrationServices.esSupertest,
  supertestWithoutAuth: apiIntegrationServices.supertestWithoutAuth,
};
// eslint-disable-next-line import/no-default-export
export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const xPackAPITestsConfig = await readConfigFile(
    require.resolve('../../api_integration/config.ts')
  );

  const readOnlyObjectsPlugin = resolve(
    __dirname,
    '../common/plugins/read_only_objects_test_plugin'
  );
  const kibanaPort = xPackAPITestsConfig.get('servers.kibana.port');
  const idpPath = require.resolve('@kbn/security-api-integration-helpers/saml/idp_metadata.xml');
  return {
    testFiles: [resolve(__dirname, './apis/spaces/read_only_objects.ts')],
    services,
    servers: xPackAPITestsConfig.get('servers'),
    esTestCluster: {
      ...xPackAPITestsConfig.get('esTestCluster'),
      serverArgs: [
        ...xPackAPITestsConfig.get('esTestCluster.serverArgs'),
        'xpack.security.enabled=true',
        'xpack.security.authc.api_key.enabled=true',
        'xpack.security.authc.token.enabled=true',
        'xpack.security.authc.realms.saml.saml1.order=0',
        `xpack.security.authc.realms.saml.saml1.idp.metadata.path=${idpPath}`,
        'xpack.security.authc.realms.saml.saml1.idp.entity_id=http://www.elastic.co/saml1',
        `xpack.security.authc.realms.saml.saml1.sp.entity_id=http://localhost:${kibanaPort}`,
        `xpack.security.authc.realms.saml.saml1.sp.logout=http://localhost:${kibanaPort}/logout`,
        `xpack.security.authc.realms.saml.saml1.sp.acs=http://localhost:${kibanaPort}/api/security/saml/callback`,
        'xpack.security.authc.realms.saml.saml1.attributes.principal=urn:oid:0.0.7',
      ],
    },

    kbnTestServer: {
      ...xPackAPITestsConfig.get('kbnTestServer'),
      serverArgs: [
        ...xPackAPITestsConfig.get('kbnTestServer.serverArgs'),
        `--plugin-path=${readOnlyObjectsPlugin}`,
        `--xpack.security.authc.providers=${JSON.stringify({
          basic: { basic1: { order: 0 } },
          saml: { saml1: { order: 1, realm: 'saml1' } },
        })}`,
      ],
    },
    security: {
      ...xPackAPITestsConfig.get('security'),
      roles: {
        ...xPackAPITestsConfig.get('security.roles'),
        kibana_savedobjects_editor: {
          kibana: [
            {
              base: [],
              feature: {
                savedObjects: ['all'],
                dev_tools: ['all'],
                savedObjectsManagement: ['all'],
              },
              spaces: ['*'],
            },
          ],
          elasticsearch: {
            cluster: ['monitor'],
            indices: [
              {
                names: ['.kibana*'],
                privileges: ['read', 'write', 'create', 'delete', 'view_index_metadata'],
              },
            ],
          },
        },
      },
    },

    junit: {
      reportName: 'X-Pack API Integration Tests (Read Only Saved Objects)',
    },
  };
}
