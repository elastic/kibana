/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. and/or licensed to Elasticsearch B.V.
 * under one or more contributor license agreements. Licensed under the Elastic License 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import type { KbnClientOptions } from '@kbn/test';
import { KbnClient } from '@kbn/test';

export interface StackConnectionOptions {
  kibanaUrl: string;
  elasticsearchUrl: string;
  username: string;
  password: string;
  spaceId?: string;
}

const buildUrlWithCredentials = (url: string, username: string, password: string): string => {
  const u = new URL(url);
  u.username = username;
  u.password = password;
  return u.toString();
};

export const createEsClient = ({
  elasticsearchUrl,
  username,
  password,
}: StackConnectionOptions): Client => {
  return new Client({
    node: elasticsearchUrl,
    auth: { username, password },
    requestTimeout: 60_000,
  });
};

export const createKbnClient = ({
  kibanaUrl,
  username,
  password,
  spaceId,
  log,
}: StackConnectionOptions & { log: ToolingLog }): KbnClient => {
  const url = (() => {
    if (!spaceId) return kibanaUrl;

    const base = new URL(kibanaUrl);
    // Preserve Kibana basePath (e.g. /kbn) if present
    const basePath = base.pathname.replace(/\/+$/, ''); // trim trailing slashes
    base.pathname = `${basePath}/s/${spaceId}`;
    return base.toString();
  })();
  const options: KbnClientOptions = {
    log,
    // KbnClient uses the URL (including credentials) to do basic auth.
    url: buildUrlWithCredentials(url, username, password),
    username,
    password,
  };
  return new KbnClient(options);
};
