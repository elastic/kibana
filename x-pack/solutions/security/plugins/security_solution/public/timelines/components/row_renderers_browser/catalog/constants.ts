/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { type RowRendererId, RowRendererIdEnum } from '../../../../../common/api/timeline';
import * as i18n from './translations';

export const eventRendererNames: { [key in RowRendererId]: string } = {
  [RowRendererIdEnum.alert]: i18n.ALERT_NAME,
  [RowRendererIdEnum.alerts]: i18n.ALERTS_NAME,
  [RowRendererIdEnum.auditd]: i18n.AUDITD_NAME,
  [RowRendererIdEnum.auditd_file]: i18n.AUDITD_FILE_NAME,
  [RowRendererIdEnum.library]: i18n.LIBRARY_NAME,
  [RowRendererIdEnum.system_security_event]: i18n.AUTHENTICATION_NAME,
  [RowRendererIdEnum.system_dns]: i18n.DNS_NAME,
  [RowRendererIdEnum.netflow]: i18n.FLOW_NAME,
  [RowRendererIdEnum.system]: i18n.SYSTEM_NAME,
  [RowRendererIdEnum.system_endgame_process]: i18n.PROCESS,
  [RowRendererIdEnum.registry]: i18n.REGISTRY_NAME,
  [RowRendererIdEnum.system_fim]: i18n.FIM_NAME,
  [RowRendererIdEnum.system_file]: i18n.FILE_NAME,
  [RowRendererIdEnum.system_socket]: i18n.SOCKET_NAME,
  [RowRendererIdEnum.suricata]: 'Suricata',
  [RowRendererIdEnum.threat_match]: i18n.THREAT_MATCH_NAME,
  [RowRendererIdEnum.zeek]: i18n.ZEEK_NAME,
  [RowRendererIdEnum.plain]: '',
};
