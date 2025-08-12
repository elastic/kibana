/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';
import { fleetPackageRegistryDockerImage, defineDockerServersConfig } from '@kbn/test';
import type { CreateTestConfigOptions } from '../../../../../config/serverless/config.base';
import { createTestConfig } from '../../../../../config/serverless/config.base';
import { LOGGING_CONFIG, FLEET_PLUGIN_READY_LOG_MESSAGE_REGEXP } from '../constants';

export function createCompleteTierTestConfig(options: CreateTestConfigOptions) {
  const packageRegistryConfig = path.join(__dirname, './package_registry_config.yml');
  const dockerArgs: string[] = ['-v', `${packageRegistryConfig}:/package-registry/config.yml`];

  return createTestConfig({
    kbnTestServerArgs: [`--logging.loggers=${JSON.stringify(LOGGING_CONFIG)}`],
    kbnTestServerWait: FLEET_PLUGIN_READY_LOG_MESSAGE_REGEXP,
    dockerServers: defineDockerServersConfig({
      registry: {
        enabled: true,
        image: fleetPackageRegistryDockerImage,
        portInContainer: 8080,
        port: 8081,
        args: dockerArgs,
        waitForLogLine: 'package manifests loaded',
        waitForLogLineTimeoutMs: 60 * 4 * 1000, // 4 minutes
      },
    }),
    ...options,
  });
}
