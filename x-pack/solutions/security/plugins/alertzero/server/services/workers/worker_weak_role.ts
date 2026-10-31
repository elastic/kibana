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

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  WORKER_SERVICE_ACCOUNT_NAMES,
  getWorkerRoleName,
  type WorkerBlockingReason,
} from '@kbn/alertzero-common';

/** Per-Worker reasons derived from the account the Worker is bound to. */
export type GetPerWorkerBlockingReasons = (
  workerId: string,
  serviceAccountId: string
) => Promise<WorkerBlockingReason[]>;

const ES_SERVICE_ACCOUNT_NAMESPACE = 'kibana';

/**
 * Reports `weak_role` when a Worker is bound to its own canonical service account and that
 * account no longer carries the Worker's built-in role, so the Worker's runs execute without
 * the privileges they were designed for. It is a warning, never an enable gate: the role can
 * be restored on the account without touching the Worker.
 *
 * Only the canonical account (`kibana/<name>` for the Worker's entry in
 * `WORKER_SERVICE_ACCOUNT_NAMES`) is name-checked. A Worker bound to some other account may
 * legitimately run as a custom role, so a name mismatch there proves nothing and stays silent.
 *
 * Serverless is skipped: its accounts and predefined roles are managed elsewhere and are not
 * read through this Elasticsearch API. Read failures answer with no reasons rather than
 * blocking anything, since this reason never gates.
 */
export const createGetWorkerWeakRoleReason = (
  getEsClient: () => Promise<ElasticsearchClient>,
  logger: Logger,
  { isServerless }: { isServerless: boolean }
): GetPerWorkerBlockingReasons => {
  return async (workerId, serviceAccountId) => {
    if (isServerless) return [];

    const accountName = WORKER_SERVICE_ACCOUNT_NAMES[workerId];
    if (!accountName) return [];
    const canonicalAccountId = `${ES_SERVICE_ACCOUNT_NAMESPACE}/${accountName}`;
    if (serviceAccountId !== canonicalAccountId) return [];

    const roleName = getWorkerRoleName(accountName, { isServerless });
    const esClient = await getEsClient();
    try {
      // Same read the security plugin's service accounts backend makes: an unknown principal
      // answers an empty 200 rather than a 404, and 404 is ignored so a future upstream
      // tightening does not turn "no such account" into an error.
      const response = await esClient.transport.request<Record<string, { roles?: string[] }>>(
        {
          method: 'GET',
          path: `/_security/service/${ES_SERVICE_ACCOUNT_NAMESPACE}/${encodeURIComponent(
            accountName
          )}`,
          querystring: { type: 'user_managed' },
        },
        { ignore: [404] }
      );
      const account = response?.[canonicalAccountId];
      return account?.roles?.includes(roleName) ? [] : ['weak_role'];
    } catch (error) {
      logger.warn(
        `Failed to check the role of service account ${canonicalAccountId} for worker ${workerId}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return [];
    }
  };
};
