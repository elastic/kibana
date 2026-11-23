/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SamlSessionManager } from '@kbn/test';
import type { ToolingLog } from '@kbn/tooling-log';
import { LOCAL_SERVERLESS_UIAM_ORGANIZATION_ID } from './constants';

/**
 * Logs in to a local Serverless project as `admin` through the mock IdP, as Scout does, and returns
 * the session's `Cookie` header. UIAM rejects basic auth for creating service accounts.
 */
export const createServerlessAdminCookie = async (
  kibanaUrl: string,
  log: ToolingLog
): Promise<string> => {
  const { protocol, hostname, port, pathname } = new URL(kibanaUrl);
  if (pathname.replace(/\/+$/, '') !== '') {
    throw new Error(
      `Kibana serves under the base path ${pathname}, which the Serverless login does not support. Start it with --no-base-path.`
    );
  }
  const scheme = protocol === 'https:' ? 'https' : 'http';
  const sessionManager = new SamlSessionManager({
    hostOptions: {
      protocol: scheme,
      hostname,
      port: port ? Number(port) : scheme === 'https' ? 443 : 80,
      // Only Cloud logins use them.
      username: '',
      password: '',
    },
    log,
    isCloud: false,
    cloudUsersFilePath: '',
    serverless: {
      uiam: true,
      projectType: 'oblt',
      organizationId: LOCAL_SERVERLESS_UIAM_ORGANIZATION_ID,
    },
  });
  const { Cookie } = await sessionManager.getApiCredentialsForRole('admin');
  return Cookie;
};
