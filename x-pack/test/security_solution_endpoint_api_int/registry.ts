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

/**
 * If you don't want to use the docker image version pinned below and instead want to run your own
 * registry or use an external registry you can define this environment variable when running
 * the tests to use that registry url instead.
 *
 * This is particularly useful when a developer needs to test a new package against the kibana
 * integration or functional tests. Instead of having to publish a whole new docker image we
 * can set this environment variable which will point to the location of where your package registry
 * is serving the updated package.
 *
 * This variable will not and should not be used by CI. CI should always use the pinned docker image below.
 */
const packageRegistryOverride: string | undefined = process.env.PACKAGE_REGISTRY_URL_OVERRIDE;

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

export function getRegistryUrlFromTestEnv(): string | undefined {
  let registryUrl: string | undefined;
  if (dockerRegistryPort !== undefined) {
    registryUrl = `--xpack.fleet.registryUrl=http://localhost:${dockerRegistryPort}`;
  } else if (packageRegistryOverride !== undefined) {
    registryUrl = `--xpack.fleet.registryUrl=${packageRegistryOverride}`;
  }
  return registryUrl;
}

export function getRegistryUrlAsArray(): string[] {
  const registryUrl: string | undefined = getRegistryUrlFromTestEnv();
  return registryUrl !== undefined ? [registryUrl] : [];
}

export function isRegistryEnabled() {
  return getRegistryUrlFromTestEnv() !== undefined;
}
