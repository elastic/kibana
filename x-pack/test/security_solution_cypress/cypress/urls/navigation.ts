/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const KIBANA_HOME = '/app/home#/';
export const LOGOUT_URL = '/logout';

// Common
export const GET_STARTED_URL = '/app/security/get_started';
export const MANAGE_URL = '/app/security/manage';
export const DASHBOARDS_URL = '/app/security/dashboards';

export const ASSETS_URL = '/app/security/assets';
export const ENDPOINTS_URL = '/app/security/administration/endpoints';
export const CLOUD_DEFEND_URL = '/app/security/cloud_defend';
export const POLICIES_URL = '/app/security/administration/policy';
export const TRUSTED_APPS_URL = '/app/security/administration/trusted_apps';
export const EVENT_FILTERS_URL = '/app/security/administration/event_filters';
export const BLOCKLIST_URL = '/app/security/administration/blocklist';
export const CSP_BENCHMARKS_URL = '/app/security/cloud_security_posture/benchmarks';
export const CSP_DASHBOARD_URL = '/app/security/cloud_security_posture/dashboard';
export const CSP_FINDINGS_URL = '/app/security/cloud_security_posture/findings/configurations';

export const RULES_LANDING_URL = '/app/security/rules/landing';
export const RULES_COVERAGE_URL = '/app/security/rules_coverage_overview';

export const HOSTS_URL = '/app/security/hosts/events';
export const USERS_URL = '/app/security/users/events';
export const NETWORK_URL = '/app/security/network/events';
export const OVERVIEW_URL = '/app/security/overview';

export const ENTITY_ANALYTICS_URL = '/app/security/entity_analytics';
export const KUBERNETES_URL = '/app/security/kubernetes';

export const INDICATORS_URL = '/app/security/threat_intelligence/indicators';
export const EXPLORE_URL = '/app/security/explore';
export const userDetailsUrl = (userName: string) =>
  `/app/security/users/name/${userName}/authentications`;

export const INVESTIGATIONS_URL = '/app/security/investigations';
export const TIMELINES_URL = '/app/security/timelines/default';
export const TIMELINE_TEMPLATES_URL = '/app/security/timelines/template';
export const CASES_URL = '/app/security/cases';

export const hostsUrl = (tab: 'allHosts' | 'anomalies' | 'events' | 'uncommonProcesses'): string =>
  `/app/security/hosts/${tab}`;
export const networkUrl = (
  tab: 'flows' | 'anomalies' | 'events' | 'dns' | 'http' | 'tls'
): string => `/app/security/network/${tab}`;
export const usersUrl = (tab: 'allUsers' | 'anomalies' | 'events' | 'authentications'): string =>
  `/app/security/users/${tab}`;

export const DISCOVER_WITH_FILTER_URL =
  "/app/discover#/?_g=(filters:!(),refreshInterval:(pause:!t,value:0),time:(from:now%2Fd,to:now%2Fd))&_a=(columns:!(),filters:!(('$state':(store:appState),meta:(alias:!n,disabled:!f,index:security-solution-default,key:host.name,negate:!f,params:(query:test-host),type:phrase),query:(match_phrase:(host.name:test-host)))),index:security-solution-default,interval:auto,query:(language:kuery,query:''),sort:!(!('@timestamp',desc)))";
export const DISCOVER_WITH_PINNED_FILTER_URL =
  "/app/discover#/?_g=(filters:!(('$state':(store:globalState),meta:(alias:!n,disabled:!f,index:security-solution-default,key:host.name,negate:!f,params:(query:test-host),type:phrase),query:(match_phrase:(host.name:test-host)))),refreshInterval:(pause:!t,value:0),time:(from:now-15m,to:now))&_a=(columns:!(),filters:!(),index:security-solution-default,interval:auto,query:(language:kuery,query:''),sort:!(!('@timestamp',desc)))";

export const hostDetailsUrl = (hostName: string) =>
  `/app/security/hosts/${hostName}/authentications`;

export const MACHINE_LEARNING_LANDING_URL = '/app/security/ml';

// Detection and Response
export const DETECTION_AND_RESPONSE_URL = '/app/security/detection_response';
export const ALERTS_URL = '/app/security/alerts';
export const EXCEPTIONS_URL = '/app/security/exceptions';
export const CREATE_RULE_URL = '/app/security/rules/create';
export const ENTITY_ANALYTICS_MANAGEMENT_URL = '/app/security/entity_analytics_management';
export const ENTITY_ANALYTICS_ASSET_CRITICALITY_URL =
  '/app/security/entity_analytics_asset_criticality';

export const exceptionsListDetailsUrl = (listId: string) =>
  `/app/security/exceptions/details/${listId}`;

// External (serverless)
export const DISCOVER_URL = '/app/discover';
export const OSQUERY_URL = '/app/osquery';
export const FLEET_URL = '/app/fleet';

// Entity Analytics
export const ENTITY_ANALYTICS_DASHBOARD_URL = '/app/security/entity_analytics';

// Asset Inventory
export const ASSET_INVENTORY_URL = '/app/security/asset_inventory';
