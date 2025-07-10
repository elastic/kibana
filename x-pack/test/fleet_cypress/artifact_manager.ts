/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';
import { last } from 'lodash';
import { ToolingLog } from '@kbn/tooling-log';
import { retryForSuccess } from '@kbn/ftr-common-functional-services';

const DEFAULT_VERSION = '8.15.0-SNAPSHOT';
const name = 'Artifact Manager - getLatestVersion';

export async function getLatestVersion(): Promise<string> {
  return retryForSuccess(
    new ToolingLog({ level: 'debug', writeTo: process.stdout }, { context: name }),
    {
      timeout: 60_000,
      methodName: name,
      retryCount: 20,
      block: () => axios('https://artifacts-api.elastic.co/v1/versions'),
    }
  )
    .then(
      (response) =>
        last((response.data.versions as string[]).filter((v) => v.includes('-SNAPSHOT'))) ||
        DEFAULT_VERSION
    )
    .catch(() => DEFAULT_VERSION);
}
