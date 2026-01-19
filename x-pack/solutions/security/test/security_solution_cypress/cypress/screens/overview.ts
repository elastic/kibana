/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Host Stats
const STAT_AUDITD = {
  value: '1',
  domId: '[data-test-subj="host-stat-auditbeatAuditd"]',
};
const ENDGAME_DNS = {
  value: '1',
  domId: '[data-test-subj="host-stat-endgameDns"]',
};
const ENDGAME_FILE = {
  value: '1',
  domId: '[data-test-subj="host-stat-endgameFile"]',
};
const ENDGAME_IMAGE_LOAD = {
  value: '1',
  domId: '[data-test-subj="host-stat-endgameImageLoad"]',
};
const ENDGAME_NETWORK = {
  value: '1',
  domId: '[data-test-subj="host-stat-endgameNetwork"]',
};
const ENDGAME_PROCESS = {
  value: '1',
  domId: '[data-test-subj="host-stat-endgameProcess"]',
};
const ENDGAME_REGISTRY = {
  value: '1',
  domId: '[data-test-subj="host-stat-endgameRegistry"]',
};
const ENDGAME_SECURITY = {
  value: '1',
  domId: '[data-test-subj="host-stat-endgameSecurity"]',
};
const STAT_FILEBEAT = {
  value: '1',
  domId: '[data-test-subj="host-stat-filebeatSystemModule"]',
};
const STAT_FIM = {
  value: '1',
  domId: '[data-test-subj="host-stat-auditbeatFIM"]',
};
const STAT_LOGIN = {
  value: '1',
  domId: '[data-test-subj="host-stat-auditbeatLogin"]',
};
const STAT_PACKAGE = {
  value: '1',
  domId: '[data-test-subj="host-stat-auditbeatPackage"]',
};
const STAT_PROCESS = {
  value: '1',
  domId: '[data-test-subj="host-stat-auditbeatProcess"]',
};
const STAT_USER = {
  value: '1',
  domId: '[data-test-subj="host-stat-auditbeatUser"]',
};
const STAT_WINLOGBEAT_SECURITY = {
  value: '1',
  domId: '[data-test-subj="host-stat-winlogbeatSecurity"]',
};
const STAT_WINLOGBEAT_MWSYSMON_OPERATIONAL = {
  value: '1',
  domId: '[data-test-subj="host-stat-winlogbeatMWSysmonOperational"]',
};

export const HOST_STATS = [
  STAT_AUDITD,
  ENDGAME_DNS,
  ENDGAME_FILE,
  ENDGAME_IMAGE_LOAD,
  ENDGAME_NETWORK,
  ENDGAME_PROCESS,
  ENDGAME_REGISTRY,
  ENDGAME_SECURITY,
  STAT_FILEBEAT,
  STAT_FIM,
  STAT_LOGIN,
  STAT_PACKAGE,
  STAT_PROCESS,
  STAT_USER,
  STAT_WINLOGBEAT_SECURITY,
  STAT_WINLOGBEAT_MWSYSMON_OPERATIONAL,
];

// Network Stats
const STAT_SOCKET = {
  value: '1',
  domId: '[data-test-subj="network-stat-auditbeatSocket"]',
};
const STAT_CISCO = {
  value: '1',
  domId: '[data-test-subj="network-stat-filebeatCisco"]',
};
const STAT_NETFLOW = {
  value: '1',
  domId: '[data-test-subj="network-stat-filebeatNetflow"]',
};
const STAT_PANW = {
  value: '1',
  domId: '[data-test-subj="network-stat-filebeatPanw"]',
};
const STAT_SURICATA = {
  value: '1',
  domId: '[data-test-subj="network-stat-filebeatSuricata"]',
};
const STAT_ZEEK = {
  value: '1',
  domId: '[data-test-subj="network-stat-filebeatZeek"]',
};
const STAT_DNS = {
  value: '1',
  domId: '[data-test-subj="network-stat-packetbeatDNS"]',
};
const STAT_FLOW = {
  value: '1',
  domId: '[data-test-subj="network-stat-packetbeatFlow"]',
};
const STAT_TLS = {
  value: '1',
  domId: '[data-test-subj="network-stat-packetbeatTLS"]',
};

export const NETWORK_STATS = [
  STAT_SOCKET,
  STAT_CISCO,
  STAT_NETFLOW,
  STAT_PANW,
  STAT_SURICATA,
  STAT_ZEEK,
  STAT_DNS,
  STAT_FLOW,
  STAT_TLS,
];

export const OVERVIEW_CASE_NAME = '[data-test-subj="case-details-link"]';
export const OVERVIEW_CASE_DESCRIPTION = '.euiText.euiMarkdownFormat';

export const OVERVIEW_HOST_STATS = '[data-test-subj="overview-hosts-stats"]';

export const OVERVIEW_NETWORK_STATS = '[data-test-subj="overview-network-stats"]';

export const OVERVIEW_EMPTY_PAGE = '[data-test-subj="siem-landing-page"]';

export const OVERVIEW_CTI_LINKS = '[data-test-subj="cti-dashboard-links"]';
export const OVERVIEW_CTI_LINKS_ERROR_INNER_PANEL = '[data-test-subj="cti-inner-panel-danger"]';
export const OVERVIEW_CTI_TOTAL_EVENT_COUNT = `${OVERVIEW_CTI_LINKS} [data-test-subj="header-panel-subtitle"]`;
export const OVERVIEW_CTI_ENABLE_MODULE_BUTTON = '[data-test-subj="cti-enable-module-button"]';

export const OVERVIEW_ALERTS_HISTOGRAM_EMPTY =
  '[data-test-subj="alerts-histogram-panel"] [data-test-subj="emptyPlaceholder"]';
