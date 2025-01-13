/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ESQLColumn } from '@kbn/es-types';
import { esFieldTypeToKibanaFieldType } from '@kbn/field-types';
import { DatatableColumnType } from '@kbn/expressions-plugin/common';
import { EsqlColumnMeta } from '../services/esql';

export function getKibanaColumns(columns: ESQLColumn[]): EsqlColumnMeta[] {
  return (
    columns.map(({ name, type }) => ({
      id: name,
      name,
      meta: { type: esFieldTypeToKibanaFieldType(type) as DatatableColumnType },
    })) ?? []
  );
}
