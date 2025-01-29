/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test as base } from '@playwright/test';
import { ToolingLog } from '@kbn/tooling-log';
import { HostOptions, SamlSessionManager } from '@kbn/test';
import { resolve } from 'path';
import { REPO_ROOT } from '@kbn/repo-info';

export const test = base.extend({
  samlSessionManager: async ({}, use) => {
    const log = new ToolingLog({ level: 'verbose', writeTo: process.stdout });

    const kbnHost = process.env.KIBANA_URL || process.env.BASE_URL;
    const kbnUrl = new URL(kbnHost!);

    const hostOptions: HostOptions = {
      protocol: kbnUrl.protocol as 'http' | 'https',
      hostname: kbnUrl.hostname,
      port: parseInt(kbnUrl.port, 10),
      username: process.env.ELASTICSEARCH_USERNAME ?? '',
      password: process.env.ELASTICSEARCH_PASSWORD ?? '',
    };

    const rolesFilename = process.env.PROXY_ORG ? `${process.env.PROXY_ORG}.json` : undefined;
    const cloudUsersFilePath = resolve(REPO_ROOT, '.ftr', rolesFilename ?? 'role_users.json');

    const samlSessionManager = new SamlSessionManager({
      hostOptions,
      log,
      isCloud: process.env.CLOUD_SERVERLESS === 'true',
      cloudUsersFilePath,
    });

    await use(samlSessionManager);
  },
});
