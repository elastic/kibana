/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewSpec } from '@kbn/data-views-plugin/public';
import { getGrantedRightsEsqlSource } from '../../../queries/granted_rights_esql_query';

export const getGrantedRightsEsqlCount = (namespace: string, sourcerDataView: DataViewSpec) => {
  const indexPattern = sourcerDataView?.title ?? '';
  const fields = sourcerDataView?.fields ?? {};
  return `${getGrantedRightsEsqlSource(namespace, indexPattern, fields)}
    | STATS COUNT(*)`;
};
