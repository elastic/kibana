/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolingLog } from '@kbn/tooling-log';

import { SecurityRoleName } from '@kbn/security-solution-plugin/common/test';
import { HostOptions, SamlSessionManager } from '@kbn/test';
import { DEFAULT_SERVERLESS_ROLE } from '../env_var_names_constants';

export const samlAuthentication = async (
  on: Cypress.PluginEvents,
  config: Cypress.PluginConfigOptions
): Promise<void> => {
  const log = new ToolingLog({ level: 'verbose', writeTo: process.stdout });

  const kbnHost = config.env.KIBANA_URL || config.env.BASE_URL;

  const kbnUrl = new URL(kbnHost);

  const hostOptions: HostOptions = {
    protocol: kbnUrl.protocol as 'http' | 'https',
    hostname: kbnUrl.hostname,
    port: parseInt(kbnUrl.port, 10),
    username: config.env.ELASTICSEARCH_USERNAME,
    password: config.env.ELASTICSEARCH_PASSWORD,
  };

  // If config.env.PROXY_ORG is set, it means that proxy service is used to create projects. Define the proxy org filename to override the roles.
  const rolesFilename = config.env.PROXY_ORG ? `${config.env.PROXY_ORG}.json` : undefined;

  on('task', {
    getSessionCookie: async (role: string | SecurityRoleName): Promise<string> => {
      const sessionManager = new SamlSessionManager(
        {
          hostOptions,
          log,
          isCloud: config.env.CLOUD_SERVERLESS,
        },
        rolesFilename
      );
      return sessionManager.getInteractiveUserSessionCookieWithRoleScope(role);
    },
    getFullname: async (
      role: string | SecurityRoleName = DEFAULT_SERVERLESS_ROLE
    ): Promise<string> => {
      const sessionManager = new SamlSessionManager(
        {
          hostOptions,
          log,
          isCloud: config.env.CLOUD_SERVERLESS,
        },
        rolesFilename
      );
      const { full_name: fullName } = await sessionManager.getUserData(role);
      return fullName;
    },
  });
};
