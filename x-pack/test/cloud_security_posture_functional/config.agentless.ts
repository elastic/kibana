/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrConfigProviderContext } from '@kbn/test';
import { CA_CERT_PATH, KBN_CERT_PATH, KBN_KEY_PATH } from '@kbn/dev-utils';
import { AGENTLESS_SECURITY_POSTURE_PACKAGE_VERSION } from './constants';
import { pageObjects } from './page_objects';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const xpackFunctionalConfig = await readConfigFile(require.resolve('./config.cloud.ts'));
  // FTR configuration for cloud testing
  return {
    ...xpackFunctionalConfig.getAll(),
    pageObjects,
    junit: {
      reportName: 'ESS Security Cloud Security Agentless Creating Agent Functional Tests',
    },
    kbnTestServer: {
      ...xpackFunctionalConfig.get('kbnTestServer'),
      serverArgs: [
        ...xpackFunctionalConfig.get('kbnTestServer.serverArgs'),
        `--xpack.fleet.agents.fleet_server.hosts=["https://ftr.kibana:8220"]`,
        `--xpack.fleet.internal.fleetServerStandalone=true`,
        `--xpack.fleet.agentless.enabled=true`,
        `--xpack.fleet.agentless.api.url=http://localhost:8089/agentless-api`,
        `--xpack.fleet.agentless.api.tls.certificate=${KBN_CERT_PATH}`,
        `--xpack.fleet.agentless.api.tls.key=${KBN_KEY_PATH}`,
        `--xpack.fleet.agentless.api.tls.ca=${CA_CERT_PATH}`,
        `--xpack.cloud.id=something-anything`,
        `--xpack.fleet.packages.0.name=cloud_security_posture`,
        `--xpack.fleet.packages.0.version=${AGENTLESS_SECURITY_POSTURE_PACKAGE_VERSION}`,
      ],
    },
    // load tests in the index file
    testFiles: [require.resolve('./agentless')],
  };
}
