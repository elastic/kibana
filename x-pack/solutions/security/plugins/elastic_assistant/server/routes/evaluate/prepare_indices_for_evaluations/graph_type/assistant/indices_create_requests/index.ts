/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { nycTaxisIndexCreateRequest } from './nyc_taxis-[environment].evaluations.[date]';
import { postgresLogsIndexCreateRequest } from './postgres-logs-[environment].evaluations.[date]';
import { employeesIndexCreateRequest } from './employees-[environment].evaluations.[date]';
import { metricbeatIndexCreateRequest } from './metricbeat-[environment].evaluations-[date]';
import { packetbeatIndexCreateRequest } from './packetbeat-[environment].evaluations.[date]';
import { logsIndexCreateRequest } from './logs-[environment].evaluations.[date]';

export const indicesCreateRequests = {
  nycTaxisIndexCreateRequest,
  postgresLogsIndexCreateRequest,
  employeesIndexCreateRequest,
  metricbeatIndexCreateRequest,
  packetbeatIndexCreateRequest,
  logsIndexCreateRequest,
};
