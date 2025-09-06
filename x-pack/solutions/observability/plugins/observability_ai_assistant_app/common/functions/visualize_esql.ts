/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FromSchema } from 'json-schema-to-ts';
import type { ESQLRow } from '@kbn/es-types';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import type { visualizeESQLFunction } from '../../server/functions/visualize_esql';

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
