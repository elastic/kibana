/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const CLOUD_SECURITY_POSTURE_PACKAGE_NAME = 'cloud_security_posture';

export const getPreConfiguredFleetPackages = () => [
  `--xpack.fleet.packages.0.name=${CLOUD_SECURITY_POSTURE_PACKAGE_NAME}`,
  `--xpack.fleet.packages.0.version=latest`,
];

const getPreConfiguredPackagePolicy = (id: string, index: number) => [
  `--xpack.fleet.agentPolicies.${index}.package_policies.0.id=integration-policy-${id}`,
  `--xpack.fleet.agentPolicies.${index}.package_policies.0.name=example-integration-${id}`,
  `--xpack.fleet.agentPolicies.${index}.package_policies.0.package.name=${CLOUD_SECURITY_POSTURE_PACKAGE_NAME}`,
];

export const getPreConfiguredAgentPolicies = (length: number) =>
  Array.from({ length }, (_, i) => {
    const id = String(i).padStart(2, '0');
    return [
      `--xpack.fleet.agentPolicies.${i}.id=agent-policy-${id}`,
      `--xpack.fleet.agentPolicies.${i}.name=example-agent-policy-${id}`,
      ...getPreConfiguredPackagePolicy(id, i),
    ];
  }).flat();
