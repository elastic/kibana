/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  INTERNAL_BULK_CREATE_ATTACHMENTS_URL,
  getCaseFindUserActionsUrl,
} from '@kbn/cases-plugin/common';
import type { UserActionFindResponse } from '@kbn/cases-plugin/common';
import { ELASTIC_SECURITY_RULE_ID } from '../../../../common';
import { resolvePathVariables } from '../../../common/utils/resolve_path_variables';
import { DEFAULT_ALERTS_INDEX, DETECTION_ENGINE_RULES_URL } from '../../../../common/constants';
import { request } from './common';
import type { Rule } from '../../../detection_engine/rule_management/logic';

export interface AddAlertsToCaseOptions {
  caseId: string;
  alertIds: string[];
}

export interface AddAlertsToCaseOptionsResponse {
  /** A map (object) of containing the case comment IDs for each Alert that was added */
  comments: Record<string, string>;
}

export const addAlertsToCase = ({
  caseId,
  alertIds,
}: AddAlertsToCaseOptions): AddAlertsToCaseOptionsResponse => {
  const comments: AddAlertsToCaseOptionsResponse['comments'] = {};

  request<Rule>({
    method: 'GET',
    url: DETECTION_ENGINE_RULES_URL,
    qs: { rule_id: ELASTIC_SECURITY_RULE_ID },
    headers: {
      'elastic-api-version': '2023-10-31',
    },
  }).then((ruleResponse) => {
    const endpointRuleDocId = ruleResponse.body.id;

    // Add alerts to case
    request({
      method: 'POST',
      url: resolvePathVariables(INTERNAL_BULK_CREATE_ATTACHMENTS_URL, { case_id: caseId }),
      body: alertIds.map((alertId) => {
        return {
          alertId,
          // TODO: get index for each alert id instead of assuming they are in this hardcoded index
          index: `${DEFAULT_ALERTS_INDEX}-default`,
          type: 'alert',
          rule: {
            id: endpointRuleDocId,
            name: 'Endpoint Security',
          },
          owner: 'securitySolution',
        };
      }),
    });

    // Retrieve the user Actions against the Case
    request<UserActionFindResponse>({
      method: 'GET',
      url: getCaseFindUserActionsUrl(caseId),
      qs: {
        sortOrder: 'asc',
        perPage: 100,
      },
    }).then((caseUserActionsResponse) => {
      const userActions = caseUserActionsResponse.body.userActions;

      for (const userAction of userActions) {
        if (
          userAction.type === 'comment' &&
          userAction.action === 'create' &&
          userAction.payload.comment.type === 'alert' &&
          alertIds.includes(userAction.payload.comment.alertId as string)
        ) {
          comments[userAction.payload.comment.alertId as string] = userAction.id;
        }
      }
    });
  });

  return { comments };
};
