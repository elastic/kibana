/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { isEmpty } from 'lodash/fp';
import { parseEsqlQuery } from '@kbn/securitysolution-utils';
import type { NodeHelperCreator } from '../types';
import { MISSING_INDEX_PATTERN_PLACEHOLDER } from '../../../../constants';

export interface GetValidateEsqlParams {
  logger: Logger;
}

export interface ValidateEsqlInput {
  query: string;
}

export interface ValidateEsqlOutput {
  error?: string;
}

export const getValidateEsql: NodeHelperCreator<
  GetValidateEsqlParams,
  ValidateEsqlInput,
  ValidateEsqlOutput
> = ({ logger }) => {
  return async (input) => {
    // We want to prevent infinite loops, so we increment the iterations counter for each validation run.
    let error: string = '';
    try {
      const sanitizedQuery = input.query ? sanitizeQuery(input.query) : '';
      if (!isEmpty(sanitizedQuery)) {
        const { errors, isEsqlQueryAggregating, hasMetadataOperator } =
          parseEsqlQuery(sanitizedQuery);
        if (!isEmpty(errors)) {
          error = JSON.stringify(errors);
        } else if (!isEsqlQueryAggregating && !hasMetadataOperator) {
          error = `Queries that do't use the STATS...BY function (non-aggregating queries) must include the "metadata _id, _version, _index" operator after the source command. For example: FROM logs* metadata _id, _version, _index.`;
        }
      }
    } catch (err) {
      error = err.message.toString();
      logger.debug(`Error parsing ESQL query: ${error}`);
    }
    return { error };
  };
};

function sanitizeQuery(query: string): string {
  return query
    .replace(`FROM ${MISSING_INDEX_PATTERN_PLACEHOLDER}`, 'FROM *') // Replace the index pattern placeholder with a wildcard
    .replaceAll(/\[(macro|lookup):.*?\]/g, '') // Removes any macro or lookup placeholders
    .replaceAll(/\n(\s*?\|\s*?\n)*/g, '\n'); // Removes any empty lines with | (pipe) alone after removing the placeholders
}
