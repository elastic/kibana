/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink } from '@elastic/eui';
import React from 'react';

import { type RowRendererId, RowRendererIdEnum } from '../../../../../common/api/timeline';
import {
  AlertsExample,
  AuditdExample,
  AuditdFileExample,
  LibraryExample,
  NetflowExample,
  RegistryExample,
  SuricataExample,
  SystemExample,
  SystemDnsExample,
  SystemEndgameProcessExample,
  SystemFileExample,
  SystemFimExample,
  SystemSecurityEventExample,
  SystemSocketExample,
  ThreatMatchExample,
  ZeekExample,
} from '../examples';
import { eventRendererNames } from './constants';
import * as i18n from './translations';

const Link = ({ children, url }: { children: React.ReactNode; url: string }) => (
  <EuiLink
    href={url}
    target="_blank"
    rel="noopener nofollow noreferrer"
    data-test-subj="externalLink"
  >
    {children}
  </EuiLink>
);

export interface RowRendererOption {
  id: RowRendererId;
  name: string;
  description: React.ReactNode;
  searchableDescription: string;
  example: React.ElementType;
}

export const renderers: RowRendererOption[] = [
  {
    id: RowRendererIdEnum.alerts,
    name: eventRendererNames[RowRendererIdEnum.alerts],
    description: i18n.ALERTS_DESCRIPTION,
    example: AlertsExample,
    searchableDescription: i18n.ALERTS_DESCRIPTION,
  },
  {
    id: RowRendererIdEnum.auditd,
    name: eventRendererNames[RowRendererIdEnum.auditd],
    description: (
      <span>
        <Link url="https://www.elastic.co/guide/en/beats/auditbeat/current/auditbeat-module-auditd.html">
          {i18n.AUDITD_NAME}
        </Link>{' '}
        {i18n.AUDITD_DESCRIPTION_PART1}
      </span>
    ),
    example: AuditdExample,
    searchableDescription: `${i18n.AUDITD_NAME} ${i18n.AUDITD_DESCRIPTION_PART1}`,
  },
  {
    id: RowRendererIdEnum.auditd_file,
    name: eventRendererNames[RowRendererIdEnum.auditd_file],
    description: (
      <span>
        <Link url="https://www.elastic.co/guide/en/beats/auditbeat/current/auditbeat-module-auditd.html">
          {i18n.AUDITD_NAME}
        </Link>{' '}
        {i18n.AUDITD_FILE_DESCRIPTION_PART1}
      </span>
    ),
    example: AuditdFileExample,
    searchableDescription: `${i18n.AUDITD_FILE_NAME} ${i18n.AUDITD_FILE_DESCRIPTION_PART1}`,
  },
  {
    id: RowRendererIdEnum.library,
    name: eventRendererNames[RowRendererIdEnum.library],
    description: i18n.LIBRARY_DESCRIPTION,
    example: LibraryExample,
    searchableDescription: i18n.LIBRARY_DESCRIPTION,
  },
  {
    id: RowRendererIdEnum.system_security_event,
    name: eventRendererNames[RowRendererIdEnum.system_security_event],
    description: (
      <div>
        <p>{i18n.AUTHENTICATION_DESCRIPTION_PART1}</p>
        <br />
        <p>{i18n.AUTHENTICATION_DESCRIPTION_PART2}</p>
      </div>
    ),
    example: SystemSecurityEventExample,
    searchableDescription: `${i18n.AUTHENTICATION_DESCRIPTION_PART1} ${i18n.AUTHENTICATION_DESCRIPTION_PART2}`,
  },
  {
    id: RowRendererIdEnum.system_dns,
    name: eventRendererNames[RowRendererIdEnum.system_dns],
    description: i18n.DNS_DESCRIPTION_PART1,
    example: SystemDnsExample,
    searchableDescription: i18n.DNS_DESCRIPTION_PART1,
  },
  {
    id: RowRendererIdEnum.netflow,
    name: eventRendererNames[RowRendererIdEnum.netflow],
    description: (
      <div>
        <p>{i18n.FLOW_DESCRIPTION_PART1}</p>
        <br />
        <p>{i18n.FLOW_DESCRIPTION_PART2}</p>
      </div>
    ),
    example: NetflowExample,
    searchableDescription: `${i18n.FLOW_DESCRIPTION_PART1} ${i18n.FLOW_DESCRIPTION_PART2}`,
  },
  {
    id: RowRendererIdEnum.system,
    name: eventRendererNames[RowRendererIdEnum.system],
    description: (
      <div>
        <p>
          {i18n.SYSTEM_DESCRIPTION_PART1}{' '}
          <Link url="https://www.elastic.co/guide/en/beats/auditbeat/current/auditbeat-module-system.html">
            {i18n.SYSTEM_NAME}
          </Link>{' '}
          {i18n.SYSTEM_DESCRIPTION_PART2}
        </p>
        <br />
        <p>{i18n.SYSTEM_DESCRIPTION_PART3}</p>
      </div>
    ),
    example: SystemExample,
    searchableDescription: `${i18n.SYSTEM_DESCRIPTION_PART1} ${i18n.SYSTEM_NAME} ${i18n.SYSTEM_DESCRIPTION_PART2} ${i18n.SYSTEM_DESCRIPTION_PART3}`,
  },
  {
    id: RowRendererIdEnum.system_endgame_process,
    name: eventRendererNames[RowRendererIdEnum.system_endgame_process],
    description: (
      <div>
        <p>{i18n.PROCESS_DESCRIPTION_PART1}</p>
        <br />
        <p>{i18n.PROCESS_DESCRIPTION_PART2}</p>
      </div>
    ),
    example: SystemEndgameProcessExample,
    searchableDescription: `${i18n.PROCESS_DESCRIPTION_PART1} ${i18n.PROCESS_DESCRIPTION_PART2}`,
  },
  {
    id: RowRendererIdEnum.registry,
    name: eventRendererNames[RowRendererIdEnum.registry],
    description: i18n.REGISTRY_DESCRIPTION,
    example: RegistryExample,
    searchableDescription: i18n.REGISTRY_DESCRIPTION,
  },
  {
    id: RowRendererIdEnum.system_fim,
    name: eventRendererNames[RowRendererIdEnum.system_fim],
    description: i18n.FIM_DESCRIPTION_PART1,
    example: SystemFimExample,
    searchableDescription: i18n.FIM_DESCRIPTION_PART1,
  },
  {
    id: RowRendererIdEnum.system_file,
    name: eventRendererNames[RowRendererIdEnum.system_file],
    description: i18n.FILE_DESCRIPTION_PART1,
    example: SystemFileExample,
    searchableDescription: i18n.FILE_DESCRIPTION_PART1,
  },
  {
    id: RowRendererIdEnum.system_socket,
    name: eventRendererNames[RowRendererIdEnum.system_socket],
    description: (
      <div>
        <p>{i18n.SOCKET_DESCRIPTION_PART1}</p>
        <br />
        <p>{i18n.SOCKET_DESCRIPTION_PART2}</p>
      </div>
    ),
    example: SystemSocketExample,
    searchableDescription: `${i18n.SOCKET_DESCRIPTION_PART1} ${i18n.SOCKET_DESCRIPTION_PART2}`,
  },
  {
    id: RowRendererIdEnum.suricata,
    name: eventRendererNames[RowRendererIdEnum.suricata],
    description: (
      <p>
        {i18n.SURICATA_DESCRIPTION_PART1}{' '}
        <Link url="https://www.elastic.co/guide/en/beats/filebeat/current/filebeat-module-suricata.html">
          {i18n.SURICATA_NAME}
        </Link>{' '}
        {i18n.SURICATA_DESCRIPTION_PART2}
      </p>
    ),
    example: SuricataExample,
    searchableDescription: `${i18n.SURICATA_DESCRIPTION_PART1} ${i18n.SURICATA_NAME} ${i18n.SURICATA_DESCRIPTION_PART2}`,
  },
  {
    id: RowRendererIdEnum.threat_match,
    name: eventRendererNames[RowRendererIdEnum.threat_match],
    description: i18n.THREAT_MATCH_DESCRIPTION,
    example: ThreatMatchExample,
    searchableDescription: `${i18n.THREAT_MATCH_NAME} ${i18n.THREAT_MATCH_DESCRIPTION}`,
  },
  {
    id: RowRendererIdEnum.zeek,
    name: eventRendererNames[RowRendererIdEnum.zeek],
    description: (
      <p>
        {i18n.ZEEK_DESCRIPTION_PART1}{' '}
        <Link url="https://www.elastic.co/guide/en/beats/filebeat/current/filebeat-module-zeek.html">
          {i18n.ZEEK_NAME}
        </Link>{' '}
        {i18n.ZEEK_DESCRIPTION_PART2}
      </p>
    ),
    example: ZeekExample,
    searchableDescription: `${i18n.ZEEK_DESCRIPTION_PART1} ${i18n.ZEEK_NAME} ${i18n.ZEEK_DESCRIPTION_PART2}`,
  },
];
