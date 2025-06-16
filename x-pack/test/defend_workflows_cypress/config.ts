/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';
import { CA_CERT_PATH } from '@kbn/dev-utils';
import { getLocalhostRealIp } from '@kbn/security-solution-plugin/scripts/endpoint/common/network_services';
import { services } from './services';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const kibanaCommonTestsConfig = await readConfigFile(
    require.resolve('@kbn/test-suites-src/common/config')
  );
  const xpackFunctionalTestsConfig = await readConfigFile(
    require.resolve('../functional/config.base.js')
  );

  const hostIp = getLocalhostRealIp();

  return {
    ...kibanaCommonTestsConfig.getAll(),

    services,

    esTestCluster: {
      ...xpackFunctionalTestsConfig.get('esTestCluster'),
      serverArgs: [
        ...xpackFunctionalTestsConfig.get('esTestCluster.serverArgs'),
        // define custom es server here
        // API Keys is enabled at the top level
        'xpack.security.enabled=true',
        'http.host=0.0.0.0',
        'xpack.ml.enabled=false',
      ],
    },

    kbnTestServer: {
      ...xpackFunctionalTestsConfig.get('kbnTestServer'),
      serverArgs: [
        ...xpackFunctionalTestsConfig.get('kbnTestServer.serverArgs'),
        '--csp.warnLegacyBrowsers=false',
        '--csp.strict=false',
        // define custom kibana server args here
        `--elasticsearch.ssl.certificateAuthorities=${CA_CERT_PATH}`,
        `--xpack.fleet.agents.fleet_server.hosts=["https://${hostIp}:8220"]`,
        `--xpack.fleet.agents.elasticsearch.host=http://${hostIp}:${kibanaCommonTestsConfig.get(
          'servers.elasticsearch.port'
        )}`,
      ],
    },
  };
}
