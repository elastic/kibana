/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewSpec } from '@kbn/data-views-plugin/public';
import { getPrivilegedMonitorUsersJoin } from '../../../queries/helpers';

export const getActivePrivilegedUsersEsqlCount = (
  namespace: string,
  sourcerDataView: DataViewSpec
) => {
  const indexPattern = sourcerDataView?.title ?? '';
  return `FROM ${indexPattern} METADATA _id, _index
      ${getPrivilegedMonitorUsersJoin(namespace)}
      | STATS \`COUNT(*)\` = COUNT_DISTINCT(user.name)`;
};
