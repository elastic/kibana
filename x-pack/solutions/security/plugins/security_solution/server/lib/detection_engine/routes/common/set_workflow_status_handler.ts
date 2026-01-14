/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Indices } from '@elastic/elasticsearch/lib/api/types';
import type { KibanaRequest, KibanaResponseFactory, AuthenticatedUser } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import {
  ALERT_WORKFLOW_STATUS,
  ALERT_WORKFLOW_STATUS_UPDATED_AT,
  ALERT_WORKFLOW_USER,
  ALERT_WORKFLOW_REASON,
} from '@kbn/rule-data-utils';

import { AlertStatusEnum } from '../../../../../common/api/model';
import type { SecuritySolutionRequestHandlerContext } from '../../../../types';
import {
  SetAlertsStatusByIds,
  type SetAlertsStatusRequestBody,
} from '../../../../../common/api/detection_engine/signals';
import { buildSiemResponse } from '../utils';

interface SetWorkflowStatusProps {
  context: SecuritySolutionRequestHandlerContext;
  request: KibanaRequest<unknown, unknown, SetAlertsStatusRequestBody>;
  response: KibanaResponseFactory;
  getIndexPattern: () => Promise<Indices>;
}

export const setWorkflowStatusHandler = async ({
  context,
  request,
  response,
  getIndexPattern,
}: SetWorkflowStatusProps) => {
  const esClient = (await context.core).elasticsearch.client.asCurrentUser;
  const siemResponse = buildSiemResponse(response);

  const body = SetAlertsStatusByIds.parse(request.body);
  const { status, signal_ids: signalIds } = body;
  let reason: string | undefined;

  if (status === AlertStatusEnum.closed && 'reason' in body) {
    reason = body.reason;
  }

  const core = await context.core;
  const user = core.security.authc.getCurrentUser();

  try {
    const indexPattern = await getIndexPattern();

    const result = await esClient.updateByQuery({
      index: indexPattern,
      refresh: true,
      script: getUpdateSignalStatusScript(status, user, reason),
      query: {
        bool: {
          filter: { terms: { _id: signalIds } },
        },
      },
      ignore_unavailable: true,
    });

    return response.ok({ body: result });
  } catch (err) {
    const error = transformError(err);
    return siemResponse.error({
      body: error.message,
      statusCode: error.statusCode,
    });
  }
};

export const getUpdateSignalStatusScript = (
  status: SetAlertsStatusByIds['status'],
  user: AuthenticatedUser | null,
  reason?: string
) => ({
  source: `
    if (ctx._source['${ALERT_WORKFLOW_STATUS}'] != null && ctx._source['${ALERT_WORKFLOW_STATUS}'] != '${status}') {
      ctx._source['${ALERT_WORKFLOW_STATUS}'] = '${status}';
      ctx._source['${ALERT_WORKFLOW_USER}'] = ${
    user?.profile_uid ? `'${user.profile_uid}'` : 'null'
  };
      ctx._source['${ALERT_WORKFLOW_STATUS_UPDATED_AT}'] = '${new Date().toISOString()}';

      ${
        reason
          ? `ctx._source['${ALERT_WORKFLOW_REASON}'] = '${reason}';`
          : `ctx._source.remove('${ALERT_WORKFLOW_REASON}')`
      }
    }
    if (ctx._source.signal != null && ctx._source.signal.status != null) {
      ctx._source.signal.status = '${status}'
    }`,
  lang: 'painless',
});
