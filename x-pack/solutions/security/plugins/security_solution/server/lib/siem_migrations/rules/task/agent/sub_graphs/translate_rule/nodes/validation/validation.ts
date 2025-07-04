/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { isEmpty } from 'lodash/fp';
import { parseEsqlQuery } from '@kbn/securitysolution-utils';
import type { GraphNode } from '../../types';

interface GetValidationNodeParams {
  logger: Logger;
}

/**
 * This node runs all validation steps, and will redirect to the END of the graph if no errors are found.
 * Any new validation steps should be added here.
 */
export const getValidationNode = ({ logger }: GetValidationNodeParams): GraphNode => {
  return async (state) => {
    const query = state.elastic_rule.query;

    // We want to prevent infinite loops, so we increment the iterations counter for each validation run.
    const currentIteration = state.validation_errors.iterations + 1;
    let esqlErrors: string = '';
    try {
      const sanitizedQuery = query ? removePlaceHolders(query) : '';
      if (!isEmpty(sanitizedQuery)) {
        const { errors, isEsqlQueryAggregating, hasMetadataOperator } =
          parseEsqlQuery(sanitizedQuery);
        if (!isEmpty(errors)) {
          esqlErrors = JSON.stringify(errors);
        } else if (!isEsqlQueryAggregating && !hasMetadataOperator) {
          esqlErrors = `Queries that do't use the STATS...BY function (non-aggregating queries) must include the "metadata _id, _version, _index" operator after the source command. For example: FROM logs* metadata _id, _version, _index.`;
        }
      }
      if (esqlErrors) {
        logger.debug(`ESQL query validation failed: ${esqlErrors}`);
      }
    } catch (error) {
      esqlErrors = error.message;
      logger.info(`Error parsing ESQL query: ${error.message}`);
    }
    return { validation_errors: { iterations: currentIteration, esql_errors: esqlErrors } };
  };
};

function removePlaceHolders(query: string): string {
  return query
    .replaceAll(/\[(macro|lookup):.*?\]/g, '') // Removes any macro or lookup placeholders
    .replaceAll(/\n(\s*?\|\s*?\n)*/g, '\n'); // Removes any empty lines with | (pipe) alone after removing the placeholders
}
