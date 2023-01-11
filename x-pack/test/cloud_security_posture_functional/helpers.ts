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

const CLOUD_SECURITY_PACKAGE_NAME = 'cloud_security_posture';
const CLOUD_SECURITY_PACKAGE_VERSION = '1.2.5';

/**
 * Package version is fixed (not latest) so FTR won't suddenly break when package is changed.
 *
 * test a new package:
 * 1. merge a new package to EPR
 * 2. locally checkout the kibana version that matches the new package
 * 3. update CLOUD_SECURITY_PACKAGE_VERSION with the new package version
 * 4. run FTR test locally
 * 5. when test pass, merge new kibana changes with the new package version.
 *
 */
const getCloudSecurityPackageConfig = () => [
  `--xpack.fleet.packages.0.name=${CLOUD_SECURITY_PACKAGE_NAME}`,
  `--xpack.fleet.packages.0.version=${CLOUD_SECURITY_PACKAGE_VERSION}`,
];

export const getCloudSecurityFleetConfig = () => [
  ...getCloudSecurityPackageConfig(),
  // Configure an agent policy that has a package policy with a cloud security package
  '--xpack.fleet.agentPolicies.0.id=agent-policy-csp',
  '--xpack.fleet.agentPolicies.0.name=example-agent-policy-csp',
  '--xpack.fleet.agentPolicies.0.package_policies.0.id=integration-policy-csp',
  '--xpack.fleet.agentPolicies.0.package_policies.0.name=example-integration-csp',
  `--xpack.fleet.agentPolicies.0.package_policies.0.package.name=${CLOUD_SECURITY_PACKAGE_NAME}`,
];
