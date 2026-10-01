/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewFieldMap } from '@kbn/data-views-plugin/common';
import { map } from 'fp-ts/Either';
import { getAuthenticationsEsqlSource } from '../../../queries/authentications_esql_query';
import type { EsqlQueryOrInvalidFields } from '../../../queries/helpers';

export const getAuthenticationsEsqlCount = (
  namespace: string,
  indexPattern: string,
  fields: DataViewFieldMap
): EsqlQueryOrInvalidFields => {
  const esqlSource = getAuthenticationsEsqlSource(namespace, indexPattern, fields);

  return map<string, string>((src) => `${src} | STATS count = COUNT(*)`)(esqlSource);
};
