/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CLOUD_CREDENTIALS_PACKAGE_VERSION } from '@kbn/cloud-security-posture-plugin/common/constants';
import { CA_CERT_PATH, KBN_CERT_PATH, KBN_KEY_PATH } from '@kbn/dev-utils';
import { createTestConfig } from '../../config.base';

export default createTestConfig({
  serverlessProject: 'security',
  junit: {
    reportName: 'Serverless Security Cloud Security Agentless API Onboarding Functional Tests',
  },
  kbnServerArgs: [
    `--xpack.fleet.packages.0.name=cloud_security_posture`,
    `--xpack.fleet.packages.0.version=${CLOUD_CREDENTIALS_PACKAGE_VERSION}`,

    `--xpack.fleet.agents.fleet_server.hosts=["https://ftr.kibana:8220"]`,
    `--xpack.fleet.internal.fleetServerStandalone=true`,

    // Agentless Configuration based on Serverless Security Dev Yaml - config/serverless.security.dev.yml
    `--xpack.fleet.agentless.enabled=true`,
    `--xpack.fleet.agentless.api.url=http://localhost:8089`,
    `--xpack.fleet.agentless.api.tls.certificate=${KBN_CERT_PATH}`,
    `--xpack.fleet.agentless.api.tls.key=${KBN_KEY_PATH}`,
    `--xpack.fleet.agentless.api.tls.ca=${CA_CERT_PATH}`,
    `--xpack.cloud.serverless.project_id=some_fake_project_id`,
  ],
  // load tests in the index file
  testFiles: [require.resolve('./ftr/cloud_security_posture/agentless_api')],
});
