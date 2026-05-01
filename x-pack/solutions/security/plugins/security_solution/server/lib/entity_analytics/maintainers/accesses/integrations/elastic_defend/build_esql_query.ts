/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getIndexPattern } from './constants';
import { buildAccessEsqlQuery } from '../shared_query_utils';

export function buildEsqlQuery(namespace: string): string {
  return buildAccessEsqlQuery(
    getIndexPattern(namespace),
    `event.action == "log_on"
    AND process.Ext.session_info.logon_type IN ("RemoteInteractive", "Interactive", "Network")`
  );
}
