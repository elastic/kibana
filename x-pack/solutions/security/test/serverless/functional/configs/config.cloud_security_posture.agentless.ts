/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CA_CERT_PATH, KBN_CERT_PATH, KBN_KEY_PATH } from '@kbn/dev-utils';
import { createTestConfig } from '@kbn/test-suites-xpack-platform/serverless/functional/config.base';
import { kbnServerArgs as fleetKbnServerArgs } from '@kbn/test-suites-xpack-platform/serverless/api_integration/services/default_fleet_setup';
import { services } from '../services';
import { pageObjects } from '../page_objects';

// TODO: Remove the agentless default config once Serverless API is merged  and default policy is deleted
export default createTestConfig({
  serverlessProject: 'security',
  pageObjects,
  services,
  junit: {
    reportName: 'Serverless Security Cloud Security Agentless Onboarding Functional Tests',
  },
  kbnServerArgs: [
    ...fleetKbnServerArgs, // Needed for correct serverless default Fleet Server and ES output

    `--xpack.fleet.packages.0.name=cloud_security_posture`,
    `--xpack.fleet.packages.0.version=latest`,
    `--xpack.fleet.agentless.enabled=true`,
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
  testFiles: [require.resolve('../test_suites/ftr/cloud_security_posture/agentless')],
  enableFleetDockerRegistry: false,
});
