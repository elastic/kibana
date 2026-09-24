/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ad2SeedId,
  type Ad2IndexedAlert,
  type Ad2IndexedRawEvent,
} from '@kbn/evals-suite-attack-discovery-agent-builder';
import { buildChainEntities, type FpTpEntityRoleKey } from './chain_entities';
import { FP_TP_BASE_TIME } from './constants';
import { withFieldMessage } from './event_message';
import type { FpTpWorld } from './types';

export type FpTpChainEventCategory = 'process' | 'network' | 'file';

export interface FpTpChainParentProcess {
  readonly name: string;
  readonly pid: number;
  readonly executable?: string;
  readonly code_signature?: { readonly status: string; readonly subject_name: string };
}

export interface FpTpChainProcess {
  readonly name: string;
  readonly pid: number;
  readonly executable: string;
  readonly commandLine?: string;
  readonly parent: FpTpChainParentProcess;
}

export interface FpTpChainDestination {
  readonly domain: string;
  readonly ip: string;
  readonly port: number;
}

/** One raw endpoint event of a chain. `key` is unique within the chain. */
export interface FpTpChainEvent {
  readonly key: string;
  readonly category: FpTpChainEventCategory;
  /** Seconds after the chain starts, which is one hour before the attack timestamp. */
  readonly offsetSeconds: number;
  readonly process: FpTpChainProcess;
  readonly destination?: FpTpChainDestination;
  readonly filePath?: string;
  readonly url?: { readonly path: string; readonly query?: string };
}

/** One detection alert. It cites the raw events that triggered it as ancestors. */
export interface FpTpChainStage {
  readonly key: string;
  readonly ruleName: string;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly riskScore: number;
  readonly reason: string;
  readonly eventKeys: readonly string[];
}

/** A replayed attack chain: the documented events, the alerts they raise, and the discovery. */
export interface FpTpChainDefinition {
  readonly key: string;
  readonly host: {
    readonly name: string;
    readonly os: { readonly type: string; readonly name: string };
  };
  readonly user: { readonly name: string; readonly domain: string };
  readonly attack: {
    readonly id: string;
    readonly title: string;
    readonly summaryMarkdown: string;
    readonly detailsMarkdown: string;
    readonly tactics: readonly string[];
  };
  readonly events: readonly FpTpChainEvent[];
  readonly stages: readonly FpTpChainStage[];
}

export interface FpTpChainIds {
  readonly hostId: string;
  readonly hostEntityId: string;
  readonly userEntityId: string;
  readonly eventId: (eventKey: string) => string;
  readonly alertId: (stageKey: string) => string;
}

const CHAIN_START_OFFSET_MS = 60 * 60 * 1000;

const ALERT_DELAY_MS = 5_000;

const isoTimestamp = (value: Date): string => value.toISOString().replace(/\.\d{3}Z$/, '.000Z');

const eventIndex = (category: FpTpChainEventCategory): string =>
  `logs-endpoint.events.${category}-default`;

const eventTime = (event: FpTpChainEvent): Date =>
  new Date(FP_TP_BASE_TIME.getTime() - CHAIN_START_OFFSET_MS + event.offsetSeconds * 1000);

/** Seeded ids of a chain. Every one is a digest of `runMarker`, so runs never share them. */
export const getChainIds = (definition: FpTpChainDefinition, runMarker: string): FpTpChainIds => {
  const hostId = ad2SeedId(runMarker, 'host', definition.host.name);
  return {
    hostId,
    hostEntityId: `host:${hostId}`,
    userEntityId: `user:${definition.user.name}@${hostId}@local`,
    eventId: (eventKey) => ad2SeedId(runMarker, 'event', definition.key, eventKey),
    alertId: (stageKey) => ad2SeedId(runMarker, 'alert', definition.key, stageKey),
  };
};

const hostDocument = (
  definition: FpTpChainDefinition,
  ids: FpTpChainIds
): Record<string, unknown> => ({
  name: definition.host.name,
  hostname: definition.host.name,
  id: ids.hostId,
  os: definition.host.os,
});

const processDocument = (
  definition: FpTpChainDefinition,
  process: FpTpChainProcess,
  runMarker: string
): Record<string, unknown> => {
  const args = (process.commandLine ?? process.executable).split(/\s+/).filter(Boolean);
  return {
    name: process.name,
    pid: process.pid,
    entity_id: ad2SeedId(runMarker, 'entity', definition.key, process.pid),
    executable: process.executable,
    command_line: process.commandLine ?? process.executable,
    args,
    args_count: args.length,
    parent: process.parent,
  };
};

const buildRawEvent = (
  definition: FpTpChainDefinition,
  event: FpTpChainEvent,
  ids: FpTpChainIds,
  runMarker: string
): Ad2IndexedRawEvent => {
  const id = ids.eventId(event.key);
  const dataset = `endpoint.events.${event.category}`;
  const source: Record<string, unknown> = {
    '@timestamp': isoTimestamp(eventTime(event)),
    ecs: { version: '9.0.0' },
    labels: { ad_portable_seed: runMarker },
    host: hostDocument(definition, ids),
    user: definition.user,
    event: {
      id,
      kind: 'event',
      category: [event.category],
      type: [event.category === 'file' ? 'creation' : 'start'],
      module: 'endpoint',
      dataset,
    },
    data_stream: { type: 'logs', dataset, namespace: 'default' },
    process: processDocument(definition, event.process, runMarker),
    ...(event.destination
      ? {
          destination: event.destination,
          network: { direction: 'egress', transport: 'tcp', protocol: 'tls' },
        }
      : {}),
    ...(event.filePath
      ? { file: { path: event.filePath, name: event.filePath.split('\\').pop() } }
      : {}),
    ...(event.url ? { url: event.url } : {}),
  };
  return withFieldMessage({ index: eventIndex(event.category), id, source });
};

const buildAlert = (
  definition: FpTpChainDefinition,
  stage: FpTpChainStage,
  ids: FpTpChainIds,
  runMarker: string
): Ad2IndexedAlert => {
  const stageEvents = definition.events.filter(({ key }) => stage.eventKeys.includes(key));
  const [firstEvent] = stageEvents;
  if (!firstEvent) {
    throw new Error(`Chain "${definition.key}" stage "${stage.key}" cites no event`);
  }
  const timestamp = isoTimestamp(
    new Date(Math.max(...stageEvents.map((event) => eventTime(event).getTime())) + ALERT_DELAY_MS)
  );
  const alertId = ids.alertId(stage.key);
  const ruleId = ad2SeedId(runMarker, 'rule', definition.key, stage.key);
  const { parent, ...process } = processDocument(definition, firstEvent.process, runMarker);
  return {
    id: alertId,
    source: {
      '@timestamp': timestamp,
      ecs: { version: '9.0.0' },
      event: {
        kind: 'signal',
        category: ['intrusion_detection'],
        module: 'endpoint',
        dataset: 'endpoint.alerts',
        action: 'rule_detection',
        risk_score: stage.riskScore,
      },
      tags: [runMarker],
      labels: { ad_portable_seed: runMarker },
      host: hostDocument(definition, ids),
      user: definition.user,
      process,
      message: stage.reason,
      rule: { name: stage.ruleName, id: ruleId, description: stage.reason },
      'kibana.alert.rule.category': 'Endpoint Behavior Detection',
      'kibana.alert.rule.consumer': 'siem',
      'kibana.alert.rule.producer': 'siem',
      'kibana.alert.rule.name': stage.ruleName,
      'kibana.alert.rule.rule_type_id': 'siem.eqlRule',
      'kibana.alert.rule.rule_id': ruleId,
      'kibana.alert.rule.uuid': ruleId,
      'kibana.alert.rule.severity': stage.severity,
      'kibana.alert.rule.risk_score': stage.riskScore,
      'kibana.alert.severity': stage.severity,
      'kibana.alert.risk_score': stage.riskScore,
      'kibana.alert.status': 'active',
      'kibana.alert.workflow_status': 'open',
      'kibana.alert.depth': 1,
      'kibana.alert.reason': stage.reason,
      'kibana.alert.original_time': timestamp,
      'kibana.alert.ancestors': stageEvents.map((event) => ({
        id: ids.eventId(event.key),
        type: 'event',
        index: eventIndex(event.category),
        depth: 0,
      })),
      'kibana.alert.uuid': alertId,
      'kibana.space_ids': ['default'],
    },
  };
};

const buildAttack = (
  definition: FpTpChainDefinition,
  ids: FpTpChainIds,
  runMarker: string
): Record<string, unknown> => ({
  '@timestamp': isoTimestamp(FP_TP_BASE_TIME),
  labels: { ad_fp_tp_twin: definition.key, ad_portable_seed: runMarker },
  'kibana.space_ids': ['default'],
  'kibana.alert.uuid': definition.attack.id,
  'kibana.alert.attack_discovery.alert_ids': definition.stages.map(({ key }) => ids.alertId(key)),
  'kibana.alert.attack_discovery.title': definition.attack.title,
  'kibana.alert.attack_discovery.entity_summary_markdown': `{{ host.name ${definition.host.name} }} / {{ user.name ${definition.user.name} }}`,
  'kibana.alert.attack_discovery.summary_markdown': definition.attack.summaryMarkdown,
  'kibana.alert.attack_discovery.details_markdown': definition.attack.detailsMarkdown,
  'kibana.alert.attack_discovery.mitre_attack_tactics': definition.attack.tactics,
});

/**
 * Renders a chain into the documents one run seeds. The attack is stamped at
 * `FP_TP_BASE_TIME` and the chain starts an hour earlier, so every event falls
 * inside the analysis's ±2h raw-event window.
 */
export const buildChainWorld = (
  definition: FpTpChainDefinition,
  runMarker: string,
  { role = 'employee_workstation' }: { readonly role?: FpTpEntityRoleKey } = {}
): FpTpWorld => {
  const ids = getChainIds(definition, runMarker);
  return {
    attackId: definition.attack.id,
    attack: buildAttack(definition, ids, runMarker),
    alerts: definition.stages.map((stage) => buildAlert(definition, stage, ids, runMarker)),
    events: definition.events.map((event) => buildRawEvent(definition, event, ids, runMarker)),
    entities: buildChainEntities(definition, ids, role, runMarker),
  };
};
