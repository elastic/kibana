/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { badRequest } from '@hapi/boom';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';

/**
 * The query a KQL expression stands for, `undefined` for none. The fields are the stored ones of
 * the OTel indices, so no data view is needed. An expression that does not parse is the client's
 * mistake, answered with a 400 that says where.
 */
export const kueryToQuery = (kuery?: string): estypes.QueryDslQueryContainer | undefined => {
  if (!kuery?.trim()) {
    return undefined;
  }
  try {
    return toElasticsearchQuery(fromKueryExpression(kuery)) as estypes.QueryDslQueryContainer;
  } catch (error) {
    throw badRequest(
      i18n.translate('xpack.digitalExperience.api.invalidKuery', {
        defaultMessage: 'The KQL query is not valid: {reason}',
        values: { reason: error instanceof Error ? error.message : String(error) },
      })
    );
  }
};
