/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import { ToolingLog } from '@kbn/tooling-log';
import type { SuperTest, Test } from 'supertest';
import {
  clearKibanaApmEventLog,
  deleteApmRules,
  deleteApmAlerts,
  deleteActionConnectorIndex,
  deleteAllActionConnectors,
} from './alerting_api_helper';

export async function cleanupRuleAndAlertState({
  es,
  supertest,
  logger,
}: {
  es: Client;
  supertest: SuperTest<Test>;
  logger: ToolingLog;
}) {
  try {
    await Promise.all([
      deleteApmRules(supertest),
      deleteApmAlerts(es),
      clearKibanaApmEventLog(es),
      deleteActionConnectorIndex(es),
      deleteAllActionConnectors({ supertest, es }),
    ]);
  } catch (e) {
    logger.error(`An error occured while cleaning up the state: ${e}`);
  }
}
