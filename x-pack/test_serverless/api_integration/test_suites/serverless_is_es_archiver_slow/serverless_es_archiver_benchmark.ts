/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint no-console: ["error",{ allow: ["log"] }] */

import { PathLike } from 'fs';
import { ToolingLog } from '@kbn/tooling-log';
import { FtrProviderContext } from '../../ftr_provider_context';
import {
  absolutePathForLogsDirectory,
  metricsFactory,
  isDryRun,
  afterAll,
  printInfoAndInitOutputLogging,
  testsLoop,
  archives,
  // eslint-disable-next-line @kbn/imports/no_boundary_crossing
} from '../../../../../test/api_integration/apis/local_and_ess_is_es_archiver_slow/utils';
import type {
  LoadResults,
  LoadResult,
  ArchiveWithManyFieldsAndOrManyDocs,
} from '../../../../../test/api_integration/apis/local_and_ess_is_es_archiver_slow/shared.types';

const LOOP_LIMIT_OVERRIDE_SERVERLESS_ONLY: number = 10;
const LOGS_DIR: string =
  process.env.LOGS_DIR ??
  'x-pack/test_serverless/api_integration/test_suites/serverless_is_es_archiver_slow/logs';

const results: LoadResults = new Set(
  archives.map((x: string): LoadResult => {
    return {
      name: x,
      label: '',
      metrics: [],
      avg: 0,
      min: 0,
      max: 0,
    };
  })
);

export default function suiteFactory({ getService }: FtrProviderContext): void {
  const esArchiver = getService('esArchiver');
  const log: ToolingLog = getService('log');
  const logDirAbsolutePath: PathLike = absolutePathForLogsDirectory(LOGS_DIR);
  const push = metricsFactory(results);
  describe(`Loop for Measuring Es Archiver Perf on Serverless ONLY`, async function serverlessBigLoopSuite() {
    before(
      async (): Promise<void> =>
        await printInfoAndInitOutputLogging(
          log,
          archives as unknown as ArchiveWithManyFieldsAndOrManyDocs[],
          logDirAbsolutePath,
          LOOP_LIMIT_OVERRIDE_SERVERLESS_ONLY
        )
    );

    archives.forEach(
      testsLoop(
        esArchiver,
        log,
        LOOP_LIMIT_OVERRIDE_SERVERLESS_ONLY,
        isDryRun(),
        push,
        logDirAbsolutePath
      )
    );

    after(async (): Promise<any> => await afterAll('SERVERLESS', logDirAbsolutePath, results)(log));
  });
}
