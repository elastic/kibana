/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';

import { defineDockerServersConfig } from '@kbn/test';
import { dockerImage as ingestDockerImage } from '../fleet_api_integration/config';

/**
 * This is used by CI to set the docker registry port
 * you can also define this environment variable locally when running tests which
 * will spin up a local docker package registry locally for you
 * if this is defined it takes precedence over the `packageRegistryOverride` variable
 */
const dockerRegistryPort: string | undefined = process.env.FLEET_PACKAGE_REGISTRY_PORT;

const defaultRegistryConfigPath = path.join(
  __dirname,
  './apis/fixtures/package_registry_config.yml'
);

export function createEndpointDockerConfig(
  packageRegistryConfig: string = defaultRegistryConfigPath,
  dockerImage: string = ingestDockerImage,
  dockerArgs: string[] = []
) {
  const args: string[] = [
    '-v',
    `${packageRegistryConfig}:/package-registry/config.yml`,
    ...dockerArgs,
  ];
  return defineDockerServersConfig({
    registry: {
      enabled: !!dockerRegistryPort,
      image: dockerImage,
      portInContainer: 8080,
      port: dockerRegistryPort,
      args,
      waitForLogLine: 'package manifests loaded',
    },
  });
}
