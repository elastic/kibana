/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { hostsUrl, networkUrl, usersUrl } from '../urls/navigation';
import { EVENT_CONTAINER_TABLE_NOT_LOADING } from './alerts';
import { ALL_HOSTS_TAB, ALL_HOSTS_TABLE, UNIQUE_IPS_VISUALIZATIONS } from './hosts/all_hosts';
import { UNCOMMON_PROCESSES_TAB } from './hosts/main';
import { HOSTS_VISUALIZATION, UNCOMMON_PROCESSES_TABLE } from './hosts/uncommon_processes';
import {
  IPS_TABLE_LOADED,
  NETWORK_DESTINATION_COUNTRIES_TABLE,
  NETWORK_DESTINATION_IPS_TABLE,
  NETWORK_DNS_VISUALIZATION,
  NETWORK_EVENTS_VISUALIZATION,
  NETWORK_FLOW_TAB,
  NETWORK_SOURCE_COUNTRIES_TABLE,
  NETWORK_TLS_HANDSHAKE_VISUALIZATION,
  NETWORK_UNIQUE_FLOW_VISUALIZATION,
} from './network/flows';

import { DNS_TAB, DNS_TABLE } from './network/dns';
import {
  ALL_USERS_TAB,
  ALL_USERS_TABLE,
  AUTHENTICATION_VISUALIZATION,
  USERS_VISUALIZATION,
} from './users/all_users';
import { AUTHENTICATIONS_TAB, AUTHENTICATIONS_TABLE } from './users/user_authentications';
import { EVENTS_TAB } from './users/user_events';
import { HTTP_TAB, HTTP_TABLE } from './network/http';
import { TLS_TAB, TLS_TABLE } from './network/tls';
import { getDataTestSubjectSelector } from '../helpers/common';
import { HOST_BY_RISK_TABLE, RISK_DETAILS_NAV } from './hosts/host_risk';
import { RISK_SCORE_TAB, RISK_SCORE_TAB_CONTENT } from './users/user_risk_score';

export const INSPECT_BUTTON_ICON = '[data-test-subj="inspect-icon-button"]';
export const INSPECT_MODAL = '[data-test-subj="modal-inspect-euiModal"]';
export const INSPECT_MODAL_REQUEST_TAB = getDataTestSubjectSelector('modal-inspect-request-tab');
export const INSPECT_MODAL_RESPONSE_TAB = getDataTestSubjectSelector('modal-inspect-response-tab');
export const INSPECT_MODAL_STATS_TAB = getDataTestSubjectSelector('modal-inspect-statistics-tab');
export const INSPECT_MODAL_INDEX_PATTERN = '[data-test-subj="index-pattern-description"]';
export const EMBEDDABLE_PANEL_TOGGLE_ICON = '[data-test-subj="embeddablePanelToggleMenuIcon"]';
export const EMBEDDABLE_PANEL_INSPECT = '[data-test-subj="embeddablePanelAction-inspect"]';

export interface InspectTableMetadata {
  altInspectId?: string;
  id: string;
  title: string;
  tab: string;
  customIndexPattern?: string;
}

export interface InspectLensVisualizationsMetadata {
  embeddableId: string;
  title: string;
  panelSelector: string;
  customIndexPattern?: string;
  tab: string;
}

export interface InspectButtonMetadata {
  pageName: string;
  url: string;
  tables: InspectTableMetadata[];
  lensVisualizations: InspectLensVisualizationsMetadata[];
}

export const INSPECT_BUTTONS_IN_SECURITY: InspectButtonMetadata[] = [
  {
    pageName: 'Hosts',
    url: hostsUrl('allHosts'),
    tables: [
      {
        title: 'All Hosts Table',
        tab: ALL_HOSTS_TAB,
        id: ALL_HOSTS_TABLE,
      },
      {
        title: 'Uncommon processes Table',
        tab: UNCOMMON_PROCESSES_TAB,
        id: UNCOMMON_PROCESSES_TABLE,
      },
      {
        title: 'Events Table',
        tab: EVENTS_TAB,
        altInspectId: '[data-test-subj="events-viewer-panel"]',
        id: EVENT_CONTAINER_TABLE_NOT_LOADING,
      },
      {
        title: 'Host risk',
        tab: RISK_DETAILS_NAV,
        customIndexPattern: 'risk-score.risk-score-latest-default',
        id: HOST_BY_RISK_TABLE,
      },
    ],
    lensVisualizations: [
      {
        title: 'all hosts',
        panelSelector: HOSTS_VISUALIZATION,
        tab: ALL_HOSTS_TAB,
        embeddableId: 'hostsKpiHostsQuery-hosts-metric-embeddable',
      },
      {
        title: 'all hosts',
        panelSelector: HOSTS_VISUALIZATION,
        tab: ALL_HOSTS_TAB,
        embeddableId: 'hostsKpiHostsQuery-area-embeddable',
      },
      {
        title: 'Unique IPs',
        panelSelector: UNIQUE_IPS_VISUALIZATIONS,
        tab: ALL_HOSTS_TAB,
        embeddableId: 'hostsKpiUniqueIpsQuery-uniqueSourceIps-metric-embeddable',
      },
      {
        title: 'Unique IPs',
        panelSelector: UNIQUE_IPS_VISUALIZATIONS,
        tab: ALL_HOSTS_TAB,
        embeddableId: 'hostsKpiUniqueIpsQuery-uniqueDestinationIps-metric-embeddable',
      },
      {
        title: 'Unique IPs',
        panelSelector: UNIQUE_IPS_VISUALIZATIONS,
        tab: ALL_HOSTS_TAB,
        embeddableId: 'hostsKpiUniqueIpsQuery-bar-embeddable',
      },
      {
        title: 'Unique IPs',
        panelSelector: UNIQUE_IPS_VISUALIZATIONS,
        tab: ALL_HOSTS_TAB,
        embeddableId: 'hostsKpiUniqueIpsQuery-area-embeddable',
      },
    ],
  },
  {
    pageName: 'Network',
    url: networkUrl('flows'),
    lensVisualizations: [
      {
        title: 'Network events',
        panelSelector: NETWORK_EVENTS_VISUALIZATION,
        tab: NETWORK_FLOW_TAB,
        embeddableId: 'networkKpiNetworkEventsQuery-networkEvents-metric-embeddable',
      },
      {
        title: 'DNS queries',
        panelSelector: NETWORK_DNS_VISUALIZATION,
        tab: NETWORK_FLOW_TAB,
        embeddableId: 'networkKpiDnsQuery-dnsQueries-metric-embeddable',
      },

      {
        title: 'Unique flow IDs',
        panelSelector: NETWORK_UNIQUE_FLOW_VISUALIZATION,
        tab: NETWORK_FLOW_TAB,
        embeddableId: 'networkKpiUniqueFlowsQuery-uniqueFlowId-metric-embeddable',
      },
      {
        title: 'TLS handshakes',
        panelSelector: NETWORK_TLS_HANDSHAKE_VISUALIZATION,
        tab: NETWORK_FLOW_TAB,
        embeddableId: 'networkKpiTlsHandshakesQuery-tlsHandshakes-metric-embeddable',
      },
      {
        title: 'Unique private IPs',
        panelSelector: UNIQUE_IPS_VISUALIZATIONS,
        tab: NETWORK_FLOW_TAB,
        embeddableId: 'networkKpiUniquePrivateIpsQuery-uniqueSourcePrivateIps-metric-embeddable',
      },
      {
        title: 'Unique private IPs',
        panelSelector: UNIQUE_IPS_VISUALIZATIONS,
        tab: NETWORK_FLOW_TAB,
        embeddableId:
          'networkKpiUniquePrivateIpsQuery-uniqueDestinationPrivateIps-metric-embeddable',
      },
    ],
    tables: [
      {
        title: 'Source IPs',
        tab: NETWORK_FLOW_TAB,
        id: IPS_TABLE_LOADED,
      },
      {
        title: 'Destination IPs',
        tab: NETWORK_FLOW_TAB,
        id: NETWORK_DESTINATION_IPS_TABLE,
      },
      {
        title: 'Source countries',
        tab: NETWORK_FLOW_TAB,
        id: NETWORK_SOURCE_COUNTRIES_TABLE,
      },
      {
        title: 'Destination countries',
        tab: NETWORK_FLOW_TAB,
        id: NETWORK_DESTINATION_COUNTRIES_TABLE,
      },
      {
        title: 'Top DNS Domains',
        tab: DNS_TAB,
        id: DNS_TABLE,
      },
      {
        title: 'HTTP Requests',
        tab: HTTP_TAB,
        id: HTTP_TABLE,
      },
      {
        title: 'Transport Layer Security',
        tab: TLS_TAB,
        id: TLS_TABLE,
      },
      {
        title: 'Events Table',
        tab: EVENTS_TAB,
        id: EVENT_CONTAINER_TABLE_NOT_LOADING,
        altInspectId: '[data-test-subj="events-viewer-panel"]',
      },
    ],
  },
  {
    pageName: 'Users',
    url: usersUrl('allUsers'),
    lensVisualizations: [
      {
        title: 'Users',
        panelSelector: USERS_VISUALIZATION,
        embeddableId: 'TotalUsersKpiQuery-users-metric-embeddable',
        tab: ALL_USERS_TAB,
      },
      {
        title: 'Users',
        panelSelector: USERS_VISUALIZATION,
        embeddableId: 'TotalUsersKpiQuery-area-embeddable',
        tab: ALL_USERS_TAB,
      },
      {
        title: 'User authentications',
        panelSelector: AUTHENTICATION_VISUALIZATION,
        embeddableId: 'usersKpiAuthentications-authenticationsSuccess-metric-embeddable',
        tab: ALL_USERS_TAB,
      },
      {
        title: 'User authentications',
        panelSelector: AUTHENTICATION_VISUALIZATION,
        embeddableId: 'usersKpiAuthentications-authenticationsFailure-metric-embeddable',
        tab: ALL_USERS_TAB,
      },
      {
        title: 'User authentications',
        panelSelector: AUTHENTICATION_VISUALIZATION,
        embeddableId: 'usersKpiAuthentications-bar-embeddable',
        tab: ALL_USERS_TAB,
      },
      {
        title: 'User authentications',
        panelSelector: AUTHENTICATION_VISUALIZATION,
        embeddableId: 'usersKpiAuthentications-area-embeddable',
        tab: ALL_USERS_TAB,
      },
      // {
      //   title: 'Events',
      //   panelSelector: EVENTS_HISTOGRAM,
      //   embeddableId: 'alertsOrEventsHistogramQuery-embeddable',
      //   tab: EVENTS_TAB,
      // },
    ],
    tables: [
      {
        title: 'Users Table',
        tab: ALL_USERS_TAB,
        id: ALL_USERS_TABLE,
      },
      {
        title: 'Destination IPs Table',
        tab: AUTHENTICATIONS_TAB,
        id: AUTHENTICATIONS_TABLE,
      },
      {
        title: 'Destination IPs Table',
        tab: EVENTS_TAB,
        id: EVENT_CONTAINER_TABLE_NOT_LOADING,
      },
      {
        title: 'User risk',
        tab: RISK_SCORE_TAB,
        id: RISK_SCORE_TAB_CONTENT,
        customIndexPattern: 'risk-score.risk-score-latest-default',
      },
    ],
  },
];
