/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/dev-utils';
import type SuperTest from 'supertest';

import { DETECTION_ENGINE_SIGNALS_FINALIZE_MIGRATION_URL } from '@kbn/security-solution-plugin/common/constants';

interface FinalizeMigrationResponse {
  id: string;
  completed?: boolean;
  error?: unknown;
}

export const finalizeSignalsMigration = async ({
  migrationIds,
  supertest,
  log,
}: {
  supertest: SuperTest.SuperTest<SuperTest.Test>;
  log: ToolingLog;
  migrationIds: string[];
}): Promise<FinalizeMigrationResponse[]> => {
  const response = await supertest
    .post(DETECTION_ENGINE_SIGNALS_FINALIZE_MIGRATION_URL)
    .set('kbn-xsrf', 'true')
    .send({ migration_ids: migrationIds });

  const {
    body: { migrations },
  }: { body: { migrations: FinalizeMigrationResponse[] } } = response;
  if (response.status !== 200) {
    log.error(
      `Did not get an expected 200 "ok" when finalizing signals migration (finalizeSignalsMigration). CI issues could happen. Suspect this line if you are seeing CI issues. body: ${JSON.stringify(
        response.body
      )}, status: ${JSON.stringify(response.status)}`
    );
  }
  return migrations;
};
