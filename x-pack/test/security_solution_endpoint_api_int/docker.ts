/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import path from 'path';

import { defineDockerServersConfig } from '@kbn/test';

const registryPort: string | undefined = process.env.INGEST_MANAGEMENT_PACKAGE_REGISTRY_PORT;

// Docker image to use for tests.
// This hash comes from the commit hash here: https://github.com/elastic/package-storage/commit/48f3935a72b0c5aacc6fec8ef36d559b089a238b
const dockerImage =
  'docker.elastic.co/package-registry/distribution:48f3935a72b0c5aacc6fec8ef36d559b089a238b';

const defaultRegistryConfigPath = path.join(
  path.dirname(__filename),
  './apis/fixtures/package_registry_config.yml'
);

export function createEndpointDockerConfig(
  packageRegistryConfig: string = defaultRegistryConfigPath,
  dockerArgs: string[] = []
) {
  const args: string[] = [
    '-v',
    `${packageRegistryConfig}:/package-registry/config.yml`,
    ...dockerArgs,
  ];
  return defineDockerServersConfig({
    registry: {
      enabled: !!registryPort,
      image: dockerImage,
      portInContainer: 8080,
      port: registryPort,
      args,
      waitForLogLine: 'package manifests loaded',
    },
  });
}

export function getRegistryUrl() {
  return registryPort !== undefined
    ? `--xpack.ingestManager.registryUrl=http://localhost:${registryPort}`
    : '';
}
