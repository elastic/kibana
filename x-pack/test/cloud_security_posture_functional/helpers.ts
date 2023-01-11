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

const CLOUD_SECURITY_POSTURE_PACKAGE_NAME = 'cloud_security_posture';

export const getCloudSecurityFleetConfig = () => [
  ...getCloudSecurityPackageConfig(),
  // Configure an agent policy that has a package policy with a cloud security package
  '--xpack.fleet.agentPolicies.0.id=agent-policy-csp',
  '--xpack.fleet.agentPolicies.0.name=example-agent-policy-csp',
  '--xpack.fleet.agentPolicies.0.package_policies.0.id=integration-policy-csp',
  '--xpack.fleet.agentPolicies.0.package_policies.0.name=example-integration-csp',
  `--xpack.fleet.agentPolicies.0.package_policies.0.package.name=${CLOUD_SECURITY_POSTURE_PACKAGE_NAME}`,
];
/**
 * Package version is fixed (not latest) so FTR won't suddenly break when package is changed.
 *
 * test a new package:
 * 1. merge a new package to EPR
 * 2. locally change the fixed version in kibana to the new package version
 * 3. run the FTR test locally
 * 4. when test pass, merge new kibana changes with the new package version.
 */
const getCloudSecurityPackageConfig = () => [
  `--xpack.fleet.packages.0.name=${CLOUD_SECURITY_POSTURE_PACKAGE_NAME}`,
  '--xpack.fleet.packages.0.version=1.0.8', // fixed version
];
