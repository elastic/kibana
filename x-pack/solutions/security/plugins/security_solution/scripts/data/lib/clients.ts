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
  const url = spaceId ? new URL(`/s/${spaceId}`, kibanaUrl).toString() : kibanaUrl;
  const options: KbnClientOptions = {
    log,
    url,
    username,
    password,
  };
  return new KbnClient(options);
};

