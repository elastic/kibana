/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { parse, type EditorError } from '@kbn/esql-ast';
import { isEmpty } from 'lodash';

export interface ValidateEsqlResult {
  isValid: boolean;
  query: string;
  parsingErrors?: EditorError[];
  executionError?: unknown;
}

export const validateEsql = async (
  esClient: ElasticsearchClient,
  query: string
): Promise<ValidateEsqlResult> => {
  const { errors: parsingErrors } = parse(query);
  if (!isEmpty(parsingErrors)) {
    return {
      isValid: false,
      query,
      parsingErrors,
    };
  }

  try {
    await esClient.esql.query({
      query: `${query}\n| LIMIT 0`, // Add a LIMIT 0 to minimize the risk of executing a costly query
      format: 'json',
    });
  } catch (executionError) {
    return {
      isValid: false,
      query,
      executionError,
    };
  }

  return {
    isValid: true,
    query,
  };
};

export const extractEsqlFromContent = (content: string): string[] => {
  const extractedEsql = [];
  let index = 0;
  while (index < content.length) {
    const start = content.indexOf('```esql', index);
    if (start === -1) {
      break;
    }
    const end = content.indexOf('```', start + 7);
    if (end === -1) {
      break;
    }
    extractedEsql.push(content.slice(start + 7, end).trim());
    index = end + 3;
  }
  return extractedEsql;
};
