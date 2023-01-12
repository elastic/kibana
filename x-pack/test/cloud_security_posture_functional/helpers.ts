/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const CLOUD_SECURITY_POSTURE_PACKAGE_NAME = 'cloud_security_posture';

/**
 * flags to load kibana with fleet pre-configured to have 'cloud_security_posture' integration installed
 */
export const getPreConfiguredFleetPackages = () => [
  `--xpack.fleet.packages.0.name=${CLOUD_SECURITY_POSTURE_PACKAGE_NAME}`,
  `--xpack.fleet.packages.0.version=latest`,
];

/**
 * flags to load kibana with pre-configured agent policy with a 'cloud_security_posture' package policy
 */
export const getPreConfiguredAgentPolicies = () => [
  `--xpack.fleet.agentPolicies.0.id=agent-policy-csp`,
  `--xpack.fleet.agentPolicies.0.name=example-agent-policy-csp`,
  `--xpack.fleet.agentPolicies.0.package_policies.0.id=integration-policy-csp`,
  `--xpack.fleet.agentPolicies.0.package_policies.0.name=example-integration-csp`,
  `--xpack.fleet.agentPolicies.0.package_policies.0.package.name=${CLOUD_SECURITY_POSTURE_PACKAGE_NAME}`,
];
