/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type SuperTest from 'supertest';

import { DETECTION_ENGINE_SIGNALS_MIGRATION_URL } from '@kbn/security-solution-plugin/common/constants';

interface CreateMigrationResponse {
  index: string;
  migration_index: string;
  migration_id: string;
}

export const startSignalsMigration = async ({
  indices,
  supertest,
  log,
}: {
  supertest: SuperTest.SuperTest<SuperTest.Test>;
  log: ToolingLog;
  indices: string[];
}): Promise<CreateMigrationResponse[]> => {
  const response = await supertest
    .post(DETECTION_ENGINE_SIGNALS_MIGRATION_URL)
    .set('kbn-xsrf', 'true')
    .send({ index: indices });

  const {
    body: { indices: created },
  }: { body: { indices: CreateMigrationResponse[] } } = response;
  if (response.status !== 200) {
    log.error(
      `Did not get an expected 200 "ok" when starting a signals migration (startSignalsMigration). CI issues could happen. Suspect this line if you are seeing CI issues. body: ${JSON.stringify(
        response.body
      )}, status: ${JSON.stringify(response.status)}`
    );
  }
  return created;
};
