/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  HostDetailsStrategyResponse,
  HostsOverviewStrategyResponse,
  HostsQueries,
  HostsStrategyResponse,
  HostsUncommonProcessesStrategyResponse,
} from './hosts';
import type {
  NetworkQueries,
  NetworkDetailsStrategyResponse,
  NetworkDnsStrategyResponse,
  NetworkTlsStrategyResponse,
  NetworkHttpStrategyResponse,
  NetworkOverviewStrategyResponse,
  NetworkTopCountriesStrategyResponse,
  NetworkTopNFlowStrategyResponse,
  NetworkUsersStrategyResponse,
  NetworkTopNFlowCountStrategyResponse,
} from './network';
import type {
  CtiEventEnrichmentStrategyResponse,
  CtiQueries,
  CtiDataSourceStrategyResponse,
} from './cti';

import type {
  RiskQueries,
  KpiRiskScoreStrategyResponse,
  HostsRiskScoreStrategyResponse,
  UsersRiskScoreStrategyResponse,
} from './risk_score';
import type { UsersQueries } from './users';
import type { ObservedUserDetailsStrategyResponse } from './users/observed_details';

import type { UsersStrategyResponse } from './users/all';
import type { UserAuthenticationsStrategyResponse } from './users/authentications';
import type { FirstLastSeenQuery, FirstLastSeenStrategyResponse } from './first_last_seen';
import type { ManagedUserDetailsStrategyResponse } from './users/managed_details';
import type { RelatedEntitiesQueries } from './related_entities';
import type { UsersRelatedHostsStrategyResponse } from './related_entities/related_hosts';
import type { HostsRelatedUsersStrategyResponse } from './related_entities/related_users';

import type {
  EventEnrichmentRequestOptions,
  EventEnrichmentRequestOptionsInput,
  FirstLastSeenRequestOptions,
  FirstLastSeenRequestOptionsInput,
  HostDetailsRequestOptions,
  HostDetailsRequestOptionsInput,
  HostOverviewRequestOptions,
  HostOverviewRequestOptionsInput,
  HostsRequestOptions,
  HostsRequestOptionsInput,
  HostUncommonProcessesRequestOptions,
  HostUncommonProcessesRequestOptionsInput,
  ManagedUserDetailsRequestOptions,
  ManagedUserDetailsRequestOptionsInput,
  NetworkDetailsRequestOptions,
  NetworkDetailsRequestOptionsInput,
  NetworkDnsRequestOptions,
  NetworkDnsRequestOptionsInput,
  NetworkHttpRequestOptions,
  NetworkHttpRequestOptionsInput,
  NetworkOverviewRequestOptions,
  NetworkOverviewRequestOptionsInput,
  NetworkTlsRequestOptions,
  NetworkTlsRequestOptionsInput,
  NetworkTopCountriesRequestOptions,
  NetworkTopCountriesRequestOptionsInput,
  NetworkTopNFlowCountRequestOptions,
  NetworkTopNFlowCountRequestOptionsInput,
  NetworkTopNFlowRequestOptions,
  NetworkTopNFlowRequestOptionsInput,
  NetworkUsersRequestOptions,
  NetworkUsersRequestOptionsInput,
  ObservedUserDetailsRequestOptions,
  ObservedUserDetailsRequestOptionsInput,
  RelatedHostsRequestOptions,
  RelatedHostsRequestOptionsInput,
  RelatedUsersRequestOptions,
  RelatedUsersRequestOptionsInput,
  RiskScoreKpiRequestOptions,
  RiskScoreKpiRequestOptionsInput,
  RiskScoreRequestOptions,
  RiskScoreRequestOptionsInput,
  ThreatIntelSourceRequestOptions,
  ThreatIntelSourceRequestOptionsInput,
  UserAuthenticationsRequestOptions,
  UserAuthenticationsRequestOptionsInput,
  UsersRequestOptions,
  UsersRequestOptionsInput,
} from '../../api/search_strategy';

export * from './cti';
export * from './hosts';
export * from './risk_score';
export * from './network';
export * from './users';
export * from './first_last_seen';
export * from './related_entities';

export type FactoryQueryTypes =
  | HostsQueries
  | UsersQueries
  | NetworkQueries
  | RiskQueries
  | CtiQueries
  | typeof FirstLastSeenQuery
  | RelatedEntitiesQueries;

export type StrategyResponseType<T extends FactoryQueryTypes> = T extends HostsQueries.hosts
  ? HostsStrategyResponse
  : T extends HostsQueries.details
  ? HostDetailsStrategyResponse
  : T extends HostsQueries.overview
  ? HostsOverviewStrategyResponse
  : T extends typeof FirstLastSeenQuery
  ? FirstLastSeenStrategyResponse
  : T extends HostsQueries.uncommonProcesses
  ? HostsUncommonProcessesStrategyResponse
  : T extends UsersQueries.observedDetails
  ? ObservedUserDetailsStrategyResponse
  : T extends UsersQueries.managedDetails
  ? ManagedUserDetailsStrategyResponse
  : T extends UsersQueries.authentications
  ? UserAuthenticationsStrategyResponse
  : T extends UsersQueries.users
  ? UsersStrategyResponse
  : T extends NetworkQueries.details
  ? NetworkDetailsStrategyResponse
  : T extends NetworkQueries.dns
  ? NetworkDnsStrategyResponse
  : T extends NetworkQueries.http
  ? NetworkHttpStrategyResponse
  : T extends NetworkQueries.overview
  ? NetworkOverviewStrategyResponse
  : T extends NetworkQueries.tls
  ? NetworkTlsStrategyResponse
  : T extends NetworkQueries.topCountries
  ? NetworkTopCountriesStrategyResponse
  : T extends NetworkQueries.topNFlow
  ? NetworkTopNFlowStrategyResponse
  : T extends NetworkQueries.topNFlowCount
  ? NetworkTopNFlowCountStrategyResponse
  : T extends NetworkQueries.users
  ? NetworkUsersStrategyResponse
  : T extends CtiQueries.eventEnrichment
  ? CtiEventEnrichmentStrategyResponse
  : T extends CtiQueries.dataSource
  ? CtiDataSourceStrategyResponse
  : T extends RiskQueries.hostsRiskScore
  ? HostsRiskScoreStrategyResponse
  : T extends RiskQueries.usersRiskScore
  ? UsersRiskScoreStrategyResponse
  : T extends RiskQueries.kpiRiskScore
  ? KpiRiskScoreStrategyResponse
  : T extends RelatedEntitiesQueries.relatedUsers
  ? HostsRelatedUsersStrategyResponse
  : T extends RelatedEntitiesQueries.relatedHosts
  ? UsersRelatedHostsStrategyResponse
  : never;

export type StrategyRequestInputType<T extends FactoryQueryTypes> = T extends HostsQueries.hosts
  ? HostsRequestOptionsInput
  : T extends HostsQueries.details
  ? HostDetailsRequestOptionsInput
  : T extends HostsQueries.overview
  ? HostOverviewRequestOptionsInput
  : T extends typeof FirstLastSeenQuery
  ? FirstLastSeenRequestOptionsInput
  : T extends HostsQueries.uncommonProcesses
  ? HostUncommonProcessesRequestOptionsInput
  : T extends UsersQueries.authentications
  ? UserAuthenticationsRequestOptionsInput
  : T extends UsersQueries.observedDetails
  ? ObservedUserDetailsRequestOptionsInput
  : T extends UsersQueries.managedDetails
  ? ManagedUserDetailsRequestOptionsInput
  : T extends UsersQueries.users
  ? UsersRequestOptionsInput
  : T extends NetworkQueries.details
  ? NetworkDetailsRequestOptionsInput
  : T extends NetworkQueries.dns
  ? NetworkDnsRequestOptionsInput
  : T extends NetworkQueries.http
  ? NetworkHttpRequestOptionsInput
  : T extends NetworkQueries.overview
  ? NetworkOverviewRequestOptionsInput
  : T extends NetworkQueries.tls
  ? NetworkTlsRequestOptionsInput
  : T extends NetworkQueries.topCountries
  ? NetworkTopCountriesRequestOptionsInput
  : T extends NetworkQueries.topNFlow
  ? NetworkTopNFlowRequestOptionsInput
  : T extends NetworkQueries.topNFlowCount
  ? NetworkTopNFlowCountRequestOptionsInput
  : T extends NetworkQueries.users
  ? NetworkUsersRequestOptionsInput
  : T extends CtiQueries.eventEnrichment
  ? EventEnrichmentRequestOptionsInput
  : T extends CtiQueries.dataSource
  ? ThreatIntelSourceRequestOptionsInput
  : T extends RiskQueries.hostsRiskScore
  ? RiskScoreRequestOptionsInput
  : T extends RiskQueries.usersRiskScore
  ? RiskScoreRequestOptionsInput
  : T extends RiskQueries.kpiRiskScore
  ? RiskScoreKpiRequestOptionsInput
  : T extends RelatedEntitiesQueries.relatedHosts
  ? RelatedHostsRequestOptionsInput
  : T extends RelatedEntitiesQueries.relatedUsers
  ? RelatedUsersRequestOptionsInput
  : never;

export type StrategyRequestType<T extends FactoryQueryTypes> = T extends HostsQueries.hosts
  ? HostsRequestOptions
  : T extends HostsQueries.details
  ? HostDetailsRequestOptions
  : T extends HostsQueries.overview
  ? HostOverviewRequestOptions
  : T extends typeof FirstLastSeenQuery
  ? FirstLastSeenRequestOptions
  : T extends HostsQueries.uncommonProcesses
  ? HostUncommonProcessesRequestOptions
  : T extends UsersQueries.authentications
  ? UserAuthenticationsRequestOptions
  : T extends UsersQueries.observedDetails
  ? ObservedUserDetailsRequestOptions
  : T extends UsersQueries.managedDetails
  ? ManagedUserDetailsRequestOptions
  : T extends UsersQueries.users
  ? UsersRequestOptions
  : T extends NetworkQueries.details
  ? NetworkDetailsRequestOptions
  : T extends NetworkQueries.dns
  ? NetworkDnsRequestOptions
  : T extends NetworkQueries.http
  ? NetworkHttpRequestOptions
  : T extends NetworkQueries.overview
  ? NetworkOverviewRequestOptions
  : T extends NetworkQueries.tls
  ? NetworkTlsRequestOptions
  : T extends NetworkQueries.topCountries
  ? NetworkTopCountriesRequestOptions
  : T extends NetworkQueries.topNFlow
  ? NetworkTopNFlowRequestOptions
  : T extends NetworkQueries.topNFlowCount
  ? NetworkTopNFlowCountRequestOptions
  : T extends NetworkQueries.users
  ? NetworkUsersRequestOptions
  : T extends CtiQueries.eventEnrichment
  ? EventEnrichmentRequestOptions
  : T extends CtiQueries.dataSource
  ? ThreatIntelSourceRequestOptions
  : T extends RiskQueries.hostsRiskScore
  ? RiskScoreRequestOptions
  : T extends RiskQueries.usersRiskScore
  ? RiskScoreRequestOptions
  : T extends RiskQueries.kpiRiskScore
  ? RiskScoreKpiRequestOptions
  : T extends RelatedEntitiesQueries.relatedHosts
  ? RelatedHostsRequestOptions
  : T extends RelatedEntitiesQueries.relatedUsers
  ? RelatedUsersRequestOptions
  : never;

export interface CommonFields {
  '@timestamp'?: string[];
}
