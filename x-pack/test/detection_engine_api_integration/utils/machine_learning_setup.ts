/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolingLog } from '@kbn/tooling-log';
import type SuperTest from 'supertest';
import { waitFor } from './wait_for';

export const executeSetupModuleRequest = async ({
  module,
  rspCode,
  supertest,
  log,
}: {
  module: string;
  rspCode: number;
  supertest: SuperTest.SuperTest<SuperTest.Test>;
  log: ToolingLog;
}) => {
  await waitFor(
    async () => {
      const { body } = await supertest
        .post(`/internal/ml/modules/setup/${module}`)
        .set('kbn-xsrf', 'true')
        .send({
          prefix: '',
          groups: ['auditbeat'],
          indexPatternName: 'auditbeat-*',
          startDatafeed: false,
          useDedicatedIndex: true,
          applyToAllSpaces: true,
        })
        .expect(rspCode);

      return body;
    },
    'waitForModuleSetup',
    log
  );
};

export const forceStartDatafeeds = async ({
  jobId,
  rspCode,
  supertest,
}: {
  jobId: string;
  rspCode: number;
  supertest: SuperTest.SuperTest<SuperTest.Test>;
}) => {
  const { body } = await supertest
    .post(`/supertest/ml/jobs/force_start_datafeeds`)
    .set('kbn-xsrf', 'true')
    .send({
      datafeedIds: [`datafeed-${jobId}`],
      start: new Date().getUTCMilliseconds(),
    })
    .expect(rspCode);

  return body;
};
