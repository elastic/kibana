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
 * 1. run a local package registry serving a new package
 * 2. uncomment the 'registryUrl' flag
 * 3. update the version to the new package version
 * 4. run the FTR test
 *
 * when tests pass:
 * 1. merge the new package
 * 2. update the package version used in FTR
 * 3. merge the FTR changes with the new fixed package version
 */
const getCloudSecurityPackageConfig = () => [
  `--xpack.fleet.packages.0.name=${CLOUD_SECURITY_POSTURE_PACKAGE_NAME}`,
  '--xpack.fleet.packages.0.version=1.0.8',
  // '--xpack.fleet.registryUrl=http://localhost:8080',
];
