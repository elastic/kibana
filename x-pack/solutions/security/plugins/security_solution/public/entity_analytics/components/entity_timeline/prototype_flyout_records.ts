/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildDataTableRecord } from '@kbn/discover-utils';
import type { DataTableRecord, EsHitRecord } from '@kbn/discover-utils';
import {
  transformAttackDiscoveryAlertDocumentToApi,
  transformAttackDiscoveryAlertFromApi,
  type AttackDiscoveryAlert,
  type AttackDiscoveryAlertDocument,
} from '@kbn/elastic-assistant-common';
import { v5 as uuidv5 } from 'uuid';
import type { EntityTimelineData, EntityTimelineEvent } from './types';

/**
 * Design-prototype only: builds alert and attack documents from timeline events so the real
 * v2 document and attack flyouts can render without seeding Elasticsearch.
 */

const PROTOTYPE_NAMESPACE = '6f1c2b3e-6a2f-4c55-9d1e-7b1f0c2a9e41';
const ruleUuid = (name: string) => uuidv5(name, PROTOTYPE_NAMESPACE);

const ALERTS_INDEX = '.internal.alerts-security.alerts-default-000001';
const ATTACKS_INDEX = '.internal.alerts-security.attack.discovery.alerts-default-000001';

const MITRE_TACTICS: Record<string, string> = {
  'Initial access': 'Initial Access',
  Execution: 'Execution',
  Persistence: 'Persistence',
  'Privilege escalation': 'Privilege Escalation',
  'Credential access': 'Credential Access',
  Collection: 'Collection',
};

const STATUS: Record<string, string> = {
  open: 'open',
  acknowledged: 'acknowledged',
  closed: 'closed',
};

export const getPrototypeAlertId = (eventId: string) => `prototype-${eventId}`;

const userName = (data: EntityTimelineData) => data.entityName.split('@')[0];

const toRecord = (id: string, index: string, source: Record<string, unknown>): DataTableRecord =>
  buildDataTableRecord({
    _id: id,
    _index: index,
    _source: source,
    fields: Object.fromEntries(
      Object.entries(source).map(([key, value]) => [key, Array.isArray(value) ? value : [value]])
    ),
  } as unknown as EsHitRecord);

interface PrototypeDoc {
  id: string;
  index: string;
  source: Record<string, unknown>;
}

/** Splits bursts into their individual alerts, so the attack correlates real alert documents. */
const getAttackAlertEvents = (
  attackEvent: EntityTimelineEvent,
  data: EntityTimelineData
): EntityTimelineEvent[] =>
  (attackEvent.alertIds ?? []).flatMap((eventId) => {
    const event = data.events.find((candidate) => candidate.id === eventId);
    if (!event) return [];
    if (event.kind !== 'alert_burst') return [event];
    let offset = 0;
    return (event.burstRules ?? []).flatMap((rule) =>
      Array.from({ length: rule.count }, () => {
        offset += 1;
        return {
          ...event,
          id: `${event.id}-${offset}`,
          kind: 'alert' as const,
          title: rule.name,
          description: undefined,
          timestamp: new Date(new Date(event.timestamp).getTime() + offset * 35_000).toISOString(),
        };
      })
    );
  });

const buildAlertDoc = (event: EntityTimelineEvent, data: EntityTimelineData): PrototypeDoc => {
  const id = getPrototypeAlertId(event.id);
  const source: Record<string, unknown> = {
    '@timestamp': event.timestamp,
    'event.kind': 'signal',
    'event.category': ['authentication'],
    'event.module': event.source,
    'kibana.alert.uuid': id,
    'kibana.alert.start': event.timestamp,
    'kibana.alert.original_time': event.timestamp,
    'kibana.alert.rule.name': event.title,
    'kibana.alert.rule.uuid': ruleUuid(event.title),
    'kibana.alert.rule.rule_id': `prototype-rule-${event.id}`,
    'kibana.alert.rule.type': event.mlJob ? 'machine_learning' : 'query',
    'kibana.alert.rule.description': event.description ?? `Detects: ${event.title}.`,
    'kibana.alert.reason': `${event.title} for user ${userName(data)}${
      event.host ? ` on ${event.host}` : ''
    }.`,
    'kibana.alert.severity': event.severity ?? 'low',
    'kibana.alert.risk_score': event.ruleScore ?? 21,
    'kibana.alert.workflow_status': STATUS[event.status ?? 'open'],
    'kibana.alert.workflow_assignee_ids': [],
    'kibana.alert.workflow_tags': [],
    'kibana.space_ids': ['default'],
    'user.name': userName(data),
    'user.email': data.entityName,
    ...(event.host ? { 'host.name': event.host } : {}),
    ...(event.tactic && MITRE_TACTICS[event.tactic]
      ? { 'threat.tactic.name': [MITRE_TACTICS[event.tactic]] }
      : {}),
    ...(event.attackId ? { 'kibana.alert.attack_ids': [event.attackId] } : {}),
  };
  return { id, index: ALERTS_INDEX, source };
};

export const buildPrototypeAlertRecord = (
  event: EntityTimelineEvent,
  data: EntityTimelineData
): DataTableRecord => {
  const { id, index, source } = buildAlertDoc(event, data);
  return toRecord(id, index, source);
};

const buildAttackDoc = (
  attackEvent: EntityTimelineEvent,
  data: EntityTimelineData
): PrototypeDoc => {
  const id = attackEvent.attackId ?? attackEvent.id;
  const user = userName(data);
  const hosts = (attackEvent.relatedEntities ?? []).filter((entity) => entity.type === 'host');
  const alertIds = getAttackAlertEvents(attackEvent, data).map((event) =>
    getPrototypeAlertId(event.id)
  );

  const source: Record<string, unknown> = {
    '@timestamp': attackEvent.timestamp,
    'kibana.alert.start': attackEvent.attackStart ?? attackEvent.timestamp,
    'kibana.alert.rule.uuid': ruleUuid('attack-discovery-schedule'),
    'kibana.alert.rule.execution.uuid': ruleUuid(`generation-${id}`),
    'kibana.alert.risk_score': attackEvent.attackRiskScore ?? 90,
    'kibana.alert.workflow_status': 'acknowledged',
    'kibana.alert.workflow_assignee_ids': [],
    'kibana.alert.workflow_tags': [],
    'kibana.space_ids': ['default'],
    'kibana.alert.attack_discovery.title': attackEvent.title,
    'kibana.alert.attack_discovery.alert_ids': alertIds,
    'kibana.alert.attack_discovery.alerts_context_count': attackEvent.alertCount ?? alertIds.length,
    'kibana.alert.attack_discovery.mitre_attack_tactics': (attackEvent.tactics ?? []).map(
      (tactic) => MITRE_TACTICS[tactic] ?? tactic
    ),
    'kibana.alert.attack_discovery.summary_markdown': `A login from a new ASN for {{ user.name ${user} }} was followed by token manipulation on {{ host.name ${
      hosts[0]?.name ?? 'WKS-0412'
    } }}, a DCSync against {{ host.name ${
      hosts[1]?.name ?? 'dc-01.corp.acme.com'
    } }} and a new access key for the AWS OrgAdmin role.`,
    'kibana.alert.attack_discovery.details_markdown': [
      `- **Initial access.** {{ user.name ${user} }} signed in to Okta from AS9009 (M247), an ASN never seen for this account, and an ML rule flagged the source IP as rare.`,
      `- **Privilege escalation.** Token manipulation on {{ host.name ${
        hosts[0]?.name ?? 'WKS-0412'
      } }} by {{ process.name powershell.exe }}.`,
      `- **Credential access.** 12 alerts in 7 minutes on {{ host.name ${
        hosts[1]?.name ?? 'dc-01.corp.acme.com'
      } }}: DCSync, NTDS.dit copy, LSASS dump and RC4 Kerberos TGT requests.`,
      `- **Persistence.** A new IAM access key was created for the AWS OrgAdmin role 20 minutes later.`,
    ].join('\n'),
    'kibana.alert.attack_discovery.entity_summary_markdown': `{{ user.name ${user} }} credentials used to reach the domain controller and AWS.`,
    'kibana.alert.attack_discovery.api_config': {
      action_type_id: '.inference',
      connector_id: 'Elastic-Managed-LLM',
      name: 'Elastic Managed LLM',
    },
    'kibana.alert.attack_discovery.users': [],
  };

  ['title', 'summary_markdown', 'details_markdown', 'entity_summary_markdown'].forEach((field) => {
    source[`kibana.alert.attack_discovery.${field}_with_replacements`] =
      source[`kibana.alert.attack_discovery.${field}`];
  });

  return { id, index: ATTACKS_INDEX, source };
};

export const buildPrototypeAttackRecord = (
  attackEvent: EntityTimelineEvent,
  data: EntityTimelineData
): { hit: DataTableRecord; attack: AttackDiscoveryAlert } => {
  const { id, source } = buildAttackDoc(attackEvent, data);
  const hit = toRecord(id, ATTACKS_INDEX, source);
  const attack = transformAttackDiscoveryAlertFromApi(
    transformAttackDiscoveryAlertDocumentToApi({
      attackDiscoveryAlertDocument: source as unknown as AttackDiscoveryAlertDocument,
      enableFieldRendering: true,
      id,
      index: ATTACKS_INDEX,
      withReplacements: true,
    })
  );
  return { hit, attack };
};

/** Every alert and attack document the timeline can open, as `_bulk` NDJSON. */
export const buildPrototypeBulkBody = (data: EntityTimelineData): string => {
  const alertEvents = data.events.filter((event) => event.kind === 'alert');
  const attackEvents = data.events.filter((event) => event.kind === 'attack');
  const docs: PrototypeDoc[] = [
    ...alertEvents.map((event) => buildAlertDoc(event, data)),
    ...attackEvents.flatMap((attackEvent) =>
      getAttackAlertEvents(attackEvent, data)
        .filter((event) => !alertEvents.some((alert) => alert.id === event.id))
        .map((event) => buildAlertDoc(event, data))
    ),
    ...attackEvents.map((attackEvent) => buildAttackDoc(attackEvent, data)),
  ];
  return `${docs
    .flatMap(({ id, index, source }) => [
      JSON.stringify({ index: { _index: index, _id: id } }),
      JSON.stringify(source),
    ])
    .join('\n')}\n`;
};
