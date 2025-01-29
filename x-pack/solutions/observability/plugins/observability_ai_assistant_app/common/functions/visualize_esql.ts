/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FromSchema } from 'json-schema-to-ts';
import { FunctionVisibility } from '@kbn/observability-ai-assistant-plugin/common';
import { VISUALIZE_ESQL_USER_INTENTIONS } from '@kbn/observability-ai-assistant-plugin/common/functions/visualize_esql';
import type { ESQLRow } from '@kbn/es-types';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';

export const visualizeESQLFunction = {
  name: 'visualize_query',
  visibility: FunctionVisibility.UserOnly,
  description: 'Use this function to visualize charts for ES|QL queries.',
  descriptionForUser: 'Use this function to visualize charts for ES|QL queries.',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
      },
      intention: {
        type: 'string',
        enum: VISUALIZE_ESQL_USER_INTENTIONS,
      },
    },
    required: ['query', 'intention'],
  } as const,
  contexts: ['core'],
};

export interface VisualizeQueryResponsev0 {
  content: DatatableColumn[];
}

export interface VisualizeQueryResponsev1 {
  data: {
    columns: DatatableColumn[];
    rows: ESQLRow[];
    userOverrides?: unknown;
  };
  content: {
    message: string;
    errorMessages: string[];
  };
}

export type VisualizeQueryResponsev2 = VisualizeQueryResponsev1 & {
  data: {
    correctedQuery: string;
  };
};

export type VisualizeQueryResponse =
  | VisualizeQueryResponsev0
  | VisualizeQueryResponsev1
  | VisualizeQueryResponsev2;

export type VisualizeESQLFunctionArguments = FromSchema<
  (typeof visualizeESQLFunction)['parameters']
>;
