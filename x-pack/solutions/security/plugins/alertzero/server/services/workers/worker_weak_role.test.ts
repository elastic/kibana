/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under the
 * Elastic License 2.0. Use of this file except in compliance with the Elastic
 * License 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { ElasticsearchClient } from '@kbn/core/server';
import {
  SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
  WORKER_SERVICE_ACCOUNT_NAMES,
} from '@kbn/alertzero-common';
import { createGetWorkerWeakRoleReason } from './worker_weak_role';

const ALERT_TRIAGE_ACCOUNT = `kibana/${WORKER_SERVICE_ACCOUNT_NAMES[SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID]}`;

/** The security plugin reads the account with `type: 'user_managed'`; an unknown principal answers an empty 200. */
const esClientReturning = (account: Record<string, unknown> | undefined) =>
  ({
    transport: {
      request: account ? jest.fn().mockResolvedValue(account) : jest.fn().mockResolvedValue({}),
    },
  } as unknown as ElasticsearchClient);

const failingEsClient = () =>
  ({
    transport: { request: jest.fn().mockRejectedValue(new Error('es down')) },
  } as unknown as ElasticsearchClient);

describe('createGetWorkerWeakRoleReason', () => {
  it('reports weak_role when the canonical account no longer carries the built-in role', async () => {
    const getWeakRole = createGetWorkerWeakRoleReason(
      async () => esClientReturning({ [ALERT_TRIAGE_ACCOUNT]: { roles: ['qa_weak_triage'] } }),
      loggingSystemMock.createLogger(),
      { isServerless: false }
    );

    await expect(
      getWeakRole(SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID, ALERT_TRIAGE_ACCOUNT)
    ).resolves.toEqual(['weak_role']);
  });

  it('has no reasons when the canonical account still carries the built-in role', async () => {
    const builtInRole = WORKER_SERVICE_ACCOUNT_NAMES[SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID];
    const getWeakRole = createGetWorkerWeakRoleReason(
      async () => esClientReturning({ [ALERT_TRIAGE_ACCOUNT]: { roles: [builtInRole] } }),
      loggingSystemMock.createLogger(),
      { isServerless: false }
    );

    await expect(
      getWeakRole(SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID, ALERT_TRIAGE_ACCOUNT)
    ).resolves.toEqual([]);
  });

  it('has no reasons for a Worker bound to some other account, even without the built-in role', async () => {
    const getWeakRole = createGetWorkerWeakRoleReason(
      async () => esClientReturning({ [ALERT_TRIAGE_ACCOUNT]: { roles: [] } }),
      loggingSystemMock.createLogger(),
      { isServerless: false }
    );

    await expect(
      getWeakRole(SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID, 'kibana/some_custom_account')
    ).resolves.toEqual([]);
  });

  it('reports weak_role when the canonical account no longer exists in Elasticsearch', async () => {
    const getWeakRole = createGetWorkerWeakRoleReason(
      async () => esClientReturning(undefined),
      loggingSystemMock.createLogger(),
      { isServerless: false }
    );

    await expect(
      getWeakRole(SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID, ALERT_TRIAGE_ACCOUNT)
    ).resolves.toEqual(['weak_role']);
  });

  it('has no reasons, and warns, when reading the account fails', async () => {
    const logger = loggingSystemMock.createLogger();
    const getWeakRole = createGetWorkerWeakRoleReason(async () => failingEsClient(), logger, {
      isServerless: false,
    });

    await expect(
      getWeakRole(SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID, ALERT_TRIAGE_ACCOUNT)
    ).resolves.toEqual([]);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining(ALERT_TRIAGE_ACCOUNT));
  });

  it('skips the check on serverless', async () => {
    const esClient = esClientReturning({});
    const getWeakRole = createGetWorkerWeakRoleReason(
      async () => esClient,
      loggingSystemMock.createLogger(),
      {
        isServerless: true,
      }
    );

    await expect(
      getWeakRole(SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID, ALERT_TRIAGE_ACCOUNT)
    ).resolves.toEqual([]);
    expect(esClient.transport.request).not.toHaveBeenCalled();
  });
});
