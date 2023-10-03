/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import type { SuperTest, Test } from 'supertest';
import {
  clearKibanaApmEventLog,
  deleteApmRules,
  deleteApmAlerts,
  deleteActionConnectorIndex,
} from './alerting_api_helper';

export async function cleanupAllState({
  es,
  supertest,
}: {
  es: Client;
  supertest: SuperTest<Test>;
}) {
  try {
    await Promise.all([
      await deleteActionConnectorIndex(es),
      await deleteApmRules(supertest),
      await deleteApmAlerts(es),
      await clearKibanaApmEventLog(es),
    ]);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(`An error occured while cleaning up the state: ${e}`);
  }
}
