/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CA_CERT_PATH, KBN_CERT_PATH, KBN_KEY_PATH } from '@kbn/dev-utils';
import { AGENTLESS_SECURITY_POSTURE_PACKAGE_VERSION } from './constants';
import { createTestConfig } from '../../config.base';

// TODO: Remove the agentless default config once Serverless API is merged  and default policy is deleted
export default createTestConfig({
  serverlessProject: 'security',
  junit: {
    reportName: 'Serverless Security Cloud Security Agentless Onboarding Functional Tests',
  },
  kbnServerArgs: [
    `--xpack.cloud.serverless.project_id=some_fake_project_id`,

    `--xpack.fleet.packages.0.name=cloud_security_posture`,
    `--xpack.fleet.packages.0.version=${AGENTLESS_SECURITY_POSTURE_PACKAGE_VERSION}`,
    `--xpack.fleet.agentless.enabled=true`,
    `--xpack.fleet.agents.fleet_server.hosts=["https://ftr.kibana:8220"]`,
    `--xpack.fleet.internal.fleetServerStandalone=true`,

    // Agentless Configuration based on Serverless Default policy`,
    `--xpack.fleet.agentPolicies.0.id=agentless`,
    `--xpack.fleet.agentPolicies.0.name=agentless`,
    `--xpack.fleet.agentPolicies.0.package_policies=[]`,
    `--xpack.fleet.agentPolicies.0.is_default=true`,
    `--xpack.fleet.agentPolicies.0.is_default_fleet_server=true`,

    `--xpack.fleet.agentless.enabled=true`,
    `--xpack.fleet.agentless.api.url=http://localhost:8089`,
    `--xpack.fleet.agentless.api.tls.certificate=${KBN_CERT_PATH}`,
    `--xpack.fleet.agentless.api.tls.key=${KBN_KEY_PATH}`,
    `--xpack.fleet.agentless.api.tls.ca=${CA_CERT_PATH}`,
  ],
  // load tests in the index file
  testFiles: [require.resolve('./ftr/cloud_security_posture/agentless')],
});
