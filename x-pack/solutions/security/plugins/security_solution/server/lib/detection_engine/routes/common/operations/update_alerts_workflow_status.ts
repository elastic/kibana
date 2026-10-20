/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Indices } from '@elastic/elasticsearch/lib/api/types';
import type { AuthenticatedUser } from '@kbn/core/server';
import {
  ALERT_WORKFLOW_REASON,
  ALERT_WORKFLOW_STATUS,
  ALERT_WORKFLOW_STATUS_UPDATED_AT,
  ALERT_WORKFLOW_USER,
} from '@kbn/rule-data-utils';

import type { SecuritySolutionRequestHandlerContext } from '../../../../../types';
import type { SetAlertsStatusByIds } from '../../../../../../common/api/detection_engine/signals';
import {
  auditAlertUpdateFailure,
  auditAlertUpdateIntent,
  auditAlertUpdateResponseFailure,
  auditAlertWorkflowStatusChange,
} from './audit_alert_updates';

interface UpdateAlertsWorkflowStatusArgs {
  context: SecuritySolutionRequestHandlerContext;
  index: Indices;
  ids: string[];
  status: SetAlertsStatusByIds['status'];
  reason?: string;
}

/**
 * Updates the workflow status of the alerts matching the provided `ids` within `index`.
 * Returns the raw `updateByQuery` response; throws on Elasticsearch errors.
 */
export const updateAlertsWorkflowStatus = async ({
  context,
  index,
  ids,
  status,
  reason,
}: UpdateAlertsWorkflowStatusArgs) => {
  const core = await context.core;
  const user = core.security.authc.getCurrentUser();
  const esClient = core.elasticsearch.client.asCurrentUser;
  const auditLogger = (await context.securitySolution).getAuditLogger();
  const target = { ids };

  auditAlertUpdateIntent(auditLogger, target);

  try {
    const response = await esClient.updateByQuery({
      index,
      refresh: true,
      script: getUpdateAlertsWorkflowStatusScript(status, user, reason),
      query: {
        bool: {
          filter: { terms: { _id: ids } },
        },
      },
      ignore_unavailable: true,
    });

    const partialFailure = auditAlertUpdateResponseFailure(auditLogger, target, response);
    if (!partialFailure) {
      auditAlertWorkflowStatusChange(auditLogger, status, response.updated);
    }
    return response;
  } catch (error) {
    auditAlertUpdateFailure(
      auditLogger,
      target,
      error instanceof Error ? error : new Error(String(error))
    );
    throw error;
  }
};

export const getUpdateAlertsWorkflowStatusScript = (
  status: SetAlertsStatusByIds['status'],
  user: AuthenticatedUser | null,
  reason?: string
) => ({
  source: `
    if (ctx._source['${ALERT_WORKFLOW_STATUS}'] != null && ctx._source['${ALERT_WORKFLOW_STATUS}'] != params.status) {
      ctx._source['${ALERT_WORKFLOW_STATUS}'] = params.status;
      ctx._source['${ALERT_WORKFLOW_USER}'] = params.workflowUser;
      ctx._source['${ALERT_WORKFLOW_STATUS_UPDATED_AT}'] = params.updatedAt;

      if (params.reason != null) {
        ctx._source['${ALERT_WORKFLOW_REASON}'] = params.reason;
      } else {
        ctx._source.remove('${ALERT_WORKFLOW_REASON}');
      }
    }
    if (ctx._source.signal != null && ctx._source.signal.status != null) {
      ctx._source.signal.status = params.status
    }`,
  lang: 'painless',
  params: {
    status,
    workflowUser: user?.profile_uid ?? null,
    updatedAt: new Date().toISOString(),
    reason: reason ?? null,
  },
});
