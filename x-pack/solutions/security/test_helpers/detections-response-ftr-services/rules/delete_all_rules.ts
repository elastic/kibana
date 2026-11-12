/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import type { ToolingLog } from '@kbn/tooling-log';
import type SuperTest from 'supertest';

import {
  DETECTION_ENGINE_RULES_BULK_ACTION,
  DETECTION_ENGINE_RULES_URL_FIND,
} from '@kbn/security-solution-plugin/common/constants';
import { getSpaceId, withSpaceUrl } from '../spaces';
import { countDownTest } from '../count_down_test';

/**
 * Deletes all detection rules in a given Kibana space.
 * Additionally, it double-checks that no rules remain after deletion.
 */
export const deleteAllRules = async (
  supertest: SuperTest.Agent,
  log: ToolingLog,
  spaceId?: string
): Promise<void> => {
  await countDownTest(
    async () => {
      await deleteAllRulesViaBulkAction(supertest, log, spaceId);
      await verifyThereAreNoRules(supertest, log, spaceId);

      return { passed: true };
    },
    'deleteAllRules',
    log,
    50,
    1000
  );
};

async function deleteAllRulesViaBulkAction(
  supertest: SuperTest.Agent,
  log: ToolingLog,
  spaceId?: string
): Promise<void> {
  const space = getSpaceId(spaceId);

  log.debug(`Delete all detection rules: starting action...`, { space });

  const response = await supertest
    .post(withSpaceUrl(DETECTION_ENGINE_RULES_BULK_ACTION, spaceId))
    .set('kbn-xsrf', 'true')
    .set('elastic-api-version', '2023-10-31')
    .send({ action: 'delete', query: '' })
    .expect(200);

  log.debug('Delete all detection rules: response received', { space, response: response.body });

  expect(response.body).toHaveProperty('success', true);
  expect(response.body).toHaveProperty('attributes.summary');

  log.debug('Delete all detection rules: deletion summary', {
    space,
    summary: response.body.attributes.summary,
  });

  expect(response.body.attributes.summary.failed).toBe(0);
  expect(response.body.attributes.summary.skipped).toBe(0);
  expect(response.body.attributes.summary.succeeded).toBeGreaterThanOrEqual(0);

  log.debug('Delete all detection rules: action succeeded ✅', { space });
}

async function verifyThereAreNoRules(
  supertest: SuperTest.Agent,
  log: ToolingLog,
  spaceId?: string
): Promise<void> {
  const space = getSpaceId(spaceId);

  log.debug(`Verify all rules deleted: checking...`, { space });

  const response = await supertest
    .get(withSpaceUrl(DETECTION_ENGINE_RULES_URL_FIND, spaceId))
    .set('kbn-xsrf', 'true')
    .set('elastic-api-version', '2023-10-31')
    .query({ page: 1, per_page: 1 }) // no need to request more data
    .send()
    .expect(200);

  log.debug('Verify all rules deleted: response received', { space, response: response.body });

  expect(response.body).toHaveProperty('total', 0);
  expect(response.body).toHaveProperty('data', []);

  log.debug(`Verify all rules deleted: checked ✅`, { space });
}
