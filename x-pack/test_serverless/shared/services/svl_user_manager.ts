/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ServerlessProjectType, SERVERLESS_ROLES_ROOT_PATH } from '@kbn/es';
import { readRolesFromResource, SamlSessionManager } from '@kbn/test';
import { resolve } from 'path';
import { FtrProviderContext } from '../../functional/ftr_provider_context';

export function SvlUserManagerProvider({ getService }: FtrProviderContext) {
  const config = getService('config');
  const log = getService('log');
  const isCloud = !!process.env.TEST_CLOUD;
  const kbnServerArgs = config.get('kbnTestServer.serverArgs') as string[];
  const projectType = kbnServerArgs
    .find((arg) => arg.startsWith('--serverless'))!
    .split('=')[1] as ServerlessProjectType;

  const resourcePath = resolve(SERVERLESS_ROLES_ROOT_PATH, projectType, 'roles.yml');
  const supportedRoles = readRolesFromResource(resourcePath);

  // Sharing the instance within FTR config run means cookies are persistent for each role between tests.
  const sessionManager = new SamlSessionManager({
    hostOptions: {
      protocol: config.get('servers.kibana.protocol'),
      hostname: config.get('servers.kibana.hostname'),
      port: isCloud ? undefined : config.get('servers.kibana.port'),
      username: config.get('servers.kibana.username'),
      password: config.get('servers.kibana.password'),
    },
    log,
    isCloud,
    supportedRoles,
  });

  return sessionManager;
}
