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
import type { SetAlertTagsRequestBody } from '../../../../../common/api/detection_engine/alert_tags';
import { buildSiemResponse } from '../utils';
import { validateAlertTagsArrays } from '../signals/helpers';

interface SetAlertTagsProps {
  context: SecuritySolutionRequestHandlerContext;
  request: KibanaRequest<unknown, unknown, SetAlertTagsRequestBody>;
  response: KibanaResponseFactory;
  getIndexPattern: () => Promise<Indices>;
  validateSiemClient?: (context: SecuritySolutionRequestHandlerContext) => Promise<boolean>;
}

export const setAlertTagsHandler = async ({
  context,
  request,
  response,
  getIndexPattern,
  validateSiemClient,
}: SetAlertTagsProps) => {
  const esClient = (await context.core).elasticsearch.client.asCurrentUser;
  const siemResponse = buildSiemResponse(response);

  const { tags, ids } = request.body;
  const validationErrors = validateAlertTagsArrays(tags, ids);

  if (validationErrors.length) {
    return siemResponse.error({ statusCode: 400, body: validationErrors });
  }

  if (validateSiemClient && !(await validateSiemClient(context))) {
    return siemResponse.error({ statusCode: 404 });
  }

  const tagsToAdd = uniq(tags.tags_to_add);
  const tagsToRemove = uniq(tags.tags_to_remove);

  const painlessScript = {
    params: { tagsToAdd, tagsToRemove },
    source: `List newTagsArray = [];
        if (ctx._source["kibana.alert.workflow_tags"] != null) {
          for (tag in ctx._source["kibana.alert.workflow_tags"]) {
            if (!params.tagsToRemove.contains(tag)) {
              newTagsArray.add(tag);
            }
          }
          for (tag in params.tagsToAdd) {
            if (!newTagsArray.contains(tag)) {
              newTagsArray.add(tag)
            }
          }
          ctx._source["kibana.alert.workflow_tags"] = newTagsArray;
        } else {
          ctx._source["kibana.alert.workflow_tags"] = params.tagsToAdd;
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
