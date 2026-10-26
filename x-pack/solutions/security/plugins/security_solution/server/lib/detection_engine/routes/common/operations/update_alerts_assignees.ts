/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq } from 'lodash/fp';
import type { Indices } from '@elastic/elasticsearch/lib/api/types';

import type { SecuritySolutionRequestHandlerContext } from '../../../../../types';
import type { SetAlertAssigneesRequestBody } from '../../../../../../common/api/detection_engine/alert_assignees';
import {
  auditAlertUpdateFailure,
  auditAlertUpdateIntent,
  auditAlertUpdateResponseFailure,
} from './audit_alert_updates';

interface UpdateAlertsAssigneesArgs {
  context: SecuritySolutionRequestHandlerContext;
  index: Indices;
  ids: string[];
  assignees: SetAlertAssigneesRequestBody['assignees'];
}

/**
 * Adds/removes assignees on the alerts matching the provided `ids` within `index`.
 * Returns the raw `updateByQuery` response; throws on Elasticsearch errors.
 */
export const updateAlertsAssignees = async ({
  context,
  index,
  ids,
  assignees,
}: UpdateAlertsAssigneesArgs) => {
  const esClient = (await context.core).elasticsearch.client.asCurrentUser;
  const auditLogger = (await context.securitySolution).getAuditLogger();
  const target = { ids };

  auditAlertUpdateIntent(auditLogger, target);

  try {
    const response = await esClient.updateByQuery({
      index,
      refresh: true,
      script: getUpdateAlertAssigneesScript(assignees),
      query: {
        bool: {
          filter: { terms: { _id: ids } },
        },
      },
      ignore_unavailable: true,
    });
    auditAlertUpdateResponseFailure(auditLogger, target, response);
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

export const getUpdateAlertAssigneesScript = (
  assignees: SetAlertAssigneesRequestBody['assignees']
) => {
  const assigneesToAdd = uniq(assignees.add);
  const assigneesToRemove = uniq(assignees.remove);

  return {
    params: { assigneesToAdd, assigneesToRemove },
    source: `List newAssigneesArray = [];
        if (ctx._source["kibana.alert.workflow_assignee_ids"] != null) {
          for (assignee in ctx._source["kibana.alert.workflow_assignee_ids"]) {
            if (!params.assigneesToRemove.contains(assignee)) {
              newAssigneesArray.add(assignee);
            }
          }
          for (assignee in params.assigneesToAdd) {
            if (!newAssigneesArray.contains(assignee)) {
              newAssigneesArray.add(assignee)
            }
          }
          ctx._source["kibana.alert.workflow_assignee_ids"] = newAssigneesArray;
        } else {
          ctx._source["kibana.alert.workflow_assignee_ids"] = params.assigneesToAdd;
        }
        `,
    lang: 'painless',
  };
};
