/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';
import fs from 'fs';
import yaml from 'js-yaml';
import { ToolingLog } from '@kbn/tooling-log';
import { HostOptions, SamlSessionManager } from '@kbn/test';
import { resolve } from 'path';
import { REPO_ROOT } from '@kbn/repo-info';

const getYamlData = (filePath: string): any => {
  const fileContents = fs.readFileSync(filePath, 'utf8');
  return yaml.load(fileContents);
};

const getRoleConfiguration = (role: string, filePath: string): any => {
  const data = getYamlData(filePath);
  if (data[role]) {
    return data[role];
  } else {
    throw new Error(`Role '${role}' not found in the YAML file.`);
  }
};

const rolesPath =
  '../../../packages/kbn-es/src/serverless_resources/project_roles/security/roles.yml';

export const getApiKeyForUser = async () => {
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

  const adminCookieHeader = await samlSessionManager.getApiCredentialsForRole('admin');

  let roleDescriptor = {};

  const roleConfig = getRoleConfiguration('admin', rolesPath);

  roleDescriptor = { ['system_indices_superuser']: roleConfig };

  const response = await axios.post(
    `${process.env.KIBANA_URL}/internal/security/api_key`,
    {
      name: 'myTestApiKey',
      metadata: {},
      role_descriptors: roleDescriptor,
    },
    {
      headers: {
        'kbn-xsrf': 'cypress-creds',
        'x-elastic-internal-origin': 'security-solution',
        ...adminCookieHeader,
      },
    }
  );

  const apiKey = response.data.encoded;

  return apiKey;
};
