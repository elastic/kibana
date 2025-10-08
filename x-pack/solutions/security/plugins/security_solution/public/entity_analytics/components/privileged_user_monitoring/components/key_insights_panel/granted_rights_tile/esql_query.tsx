/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewSpec } from '@kbn/data-views-plugin/public';
import { map } from 'fp-ts/Either';
import { getGrantedRightsEsqlSource } from '../../../queries/granted_rights_esql_query';
import type { EsqlQueryOrInvalidFields } from '../../../queries/helpers';

export const getGrantedRightsEsqlCount = (
  namespace: string,
  sourcerDataView: DataViewSpec
): EsqlQueryOrInvalidFields => {
  const indexPattern = sourcerDataView?.title ?? '';
  const fields = sourcerDataView?.fields ?? {};
  const esqlSource = getGrantedRightsEsqlSource(namespace, indexPattern, fields);

  return map<string, string>((src) => `${src} | STATS count = COUNT(*)`)(esqlSource);
};
