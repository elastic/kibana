/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseEsqlQuery } from '@kbn/securitysolution-utils';
import { isEmpty } from 'lodash/fp';

import type { Logger, ElasticsearchClient } from '@kbn/core/server';

interface ValidateEsqlQueryNodeParams {
  esClient: ElasticsearchClient;
  logger: Logger;
}

import type { RuleCreationState } from '../../../state';

export const validateEsqlQueryNode = ({ logger, esClient }: ValidateEsqlQueryNodeParams) => {
  return async (state: RuleCreationState) => {
    let error: string | undefined;
    const esqlQuery = state.rule.query;

    const { errors, isEsqlQueryAggregating, hasMetadataOperator } = parseEsqlQuery(esqlQuery);
    if (!isEmpty(errors)) {
      error = JSON.stringify(errors);
    } else if (!isEsqlQueryAggregating && !hasMetadataOperator) {
      error = `Queries that do't use the STATS...BY function (non-aggregating queries) must include the "metadata _id, _version, _index" operator after the source command. For example: FROM logs* metadata _id, _version, _index.`;
    }

    try {
      if (!error) {
        await esClient.esql.query({
          query: `${esqlQuery}\n| LIMIT 0`,
          format: 'json',
        });
      }
    } catch (err) {
      error = err.message;
      logger.debug(`Error executing ESQL query: ${error}`);
    }

    return {
      ...state,
      validationErrors: { esqlErrors: error },
    };
  };
};
