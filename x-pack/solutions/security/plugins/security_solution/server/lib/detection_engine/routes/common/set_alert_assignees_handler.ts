/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import { uniq } from 'lodash/fp';
import type { Indices } from '@elastic/elasticsearch/lib/api/types';
import type { KibanaRequest, KibanaResponseFactory } from '@kbn/core/server';

import type { SecuritySolutionRequestHandlerContext } from '../../../../types';
import type { SetAlertAssigneesRequestBody } from '../../../../../common/api/detection_engine/alert_assignees';
import { buildSiemResponse } from '../utils';
import { validateAlertAssigneesArrays } from '../signals/helpers';

interface SetAlertAssigneesProps {
  context: SecuritySolutionRequestHandlerContext;
  request: KibanaRequest<unknown, unknown, SetAlertAssigneesRequestBody>;
  response: KibanaResponseFactory;
  getIndexPattern: () => Promise<Indices>;
}

export const setAlertAssigneesHandler = async ({
  context,
  request,
  response,
  getIndexPattern,
}: SetAlertAssigneesProps) => {
  const esClient = (await context.core).elasticsearch.client.asCurrentUser;
  const siemResponse = buildSiemResponse(response);

  const { assignees, ids } = request.body;
  const validationErrors = validateAlertAssigneesArrays(assignees);

  if (validationErrors.length) {
    return siemResponse.error({ statusCode: 400, body: validationErrors });
  }

  const assigneesToAdd = uniq(assignees.add);
  const assigneesToRemove = uniq(assignees.remove);

  const painlessScript = {
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

  try {
    const indexPattern = await getIndexPattern();

    const result = await esClient.updateByQuery({
      index: indexPattern,
      refresh: true,
      script: painlessScript,
      query: {
        bool: {
          filter: { terms: { _id: ids } },
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
