/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HostsFields } from '../../../../common/api/search_strategy/hosts/model/sort';
import type { Direction } from '../../../../common/search_strategy';
import type {
  RiskScoreSortField,
  RiskSeverity,
} from '../../../../common/search_strategy/security_solution';

export enum HostsType {
  page = 'page',
  details = 'details',
}

export enum HostsTableType {
  authentications = 'authentications',
  hosts = 'allHosts',
  events = 'events',
  uncommonProcesses = 'uncommonProcesses',
  anomalies = 'anomalies',
  risk = 'hostRisk',
  sessions = 'sessions',
}

export interface BasicQueryPaginated {
  activePage: number;
  limit: number;
}

export interface HostsQuery extends BasicQueryPaginated {
  direction: Direction;
  sortField: HostsFields;
}

export interface HostRiskScoreQuery extends BasicQueryPaginated {
  sort: RiskScoreSortField;
  severitySelection: RiskSeverity[];
}

export interface HostsAnomaliesQuery {
  jobIdSelection: string[];
  intervalSelection: string;
}

export interface Queries {
  [HostsTableType.authentications]: BasicQueryPaginated;
  [HostsTableType.hosts]: HostsQuery;
  [HostsTableType.events]: BasicQueryPaginated;
  [HostsTableType.uncommonProcesses]: BasicQueryPaginated;
  [HostsTableType.anomalies]: HostsAnomaliesQuery;
  [HostsTableType.risk]: HostRiskScoreQuery;
  [HostsTableType.sessions]: BasicQueryPaginated;
}

export interface GenericHostsModel {
  queries: Queries;
}

export interface HostsModel {
  page: GenericHostsModel;
  details: GenericHostsModel;
}
