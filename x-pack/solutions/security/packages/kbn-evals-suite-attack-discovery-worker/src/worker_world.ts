/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  BAIT_ENCODED_COMMAND_LINE,
  BAIT_FALSE_POSITIVE_SCENARIO_ID,
} from './scenarios/bait_false_positive';

/**
 * The world around the seeded alerts: the entity store records and raw endpoint events the
 * review (`attack_discovery_fp_tp_analysis`) reads next to the cited alerts.
 *
 * Without them the review has nothing but the alerts, and its rules leave one reachable verdict:
 * `inconclusive` (a `false_positive` needs hits in both sources, a `true_positive` needs a
 * supporting parent or destination in the raw events). The documents here are authored to agree
 * with each scenario's gold verdict, the way an analyst would read them:
 *
 * - positive-chain-with-noise: an ordinary workstation, `powershell.exe` started by `explorer.exe`
 *   and an unknown public IP as the destination (supports);
 * - benign-batch: thin host records, management and service parents, one internal management
 *   destination (contradicts);
 * - threshold-meta-alerts: thin records, a task scheduler parent, the internal backup server as
 *   the destination (contradicts);
 * - bait-false-positive: thin records, the alerts' encoded PowerShell and scheduled task under the
 *   management agent, the internal management server as the only destination (contradicts).
 *
 * The cloud scenarios have no host, so the raw-event source can never hold hits for them and no
 * documents are seeded: their review stays `inconclusive` by construction. That is a gap in the
 * review workflow, not something to paper over with invented endpoint hosts, so those rows carry
 * `blindReason` and are scored by `BlindReviewAbstained` instead of `VerdictMatchesGold`.
 */

export type WorldKind = 'entity' | 'event';

export interface WorldDoc {
  kind: WorldKind;
  /** Written as the document `_id`; deletes use it, so cleanup never depends on a mapped field. */
  id: string;
  /** Index the document is written to. */
  index: string;
  body: Record<string, unknown>;
}

/** The entity store alias the review reads (`entities-latest-<space>`). */
export const entitiesIndexForSpace = (spaceId: string): string => `entities-latest-${spaceId}`;
export const processEventsIndexForSpace = (spaceId: string): string =>
  `logs-endpoint.events.process-${spaceId}`;
export const networkEventsIndexForSpace = (spaceId: string): string =>
  `logs-endpoint.events.network-${spaceId}`;

/** The id an endpoint alert and its raw events share; alerts carry only `host.name`. */
export const hostIdFor = (hostName: string): string =>
  `${hostName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-id`;

interface ProcessSpec {
  name: string;
  executable: string;
  commandLine: string;
  parent: string;
  user: string;
}

interface NetworkSpec {
  process: string;
  ip: string;
  domain?: string;
}

interface HostWorld {
  /** Entity record fields besides the identity; an empty object is a thin record. */
  entity: Record<string, unknown>;
  processes: readonly ProcessSpec[];
  network: readonly NetworkSpec[];
}

const POWERSHELL = 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';
const MANAGEMENT_DESTINATION: NetworkSpec = {
  process: 'CcmExec.exe',
  ip: '10.20.0.15',
  domain: 'sccm.corp.example',
};

const BENIGN_HOST: HostWorld = {
  entity: { 'asset.criticality': 'medium_impact' },
  processes: [
    {
      name: 'CcmExec.exe',
      executable: 'C:\\Windows\\CCM\\CcmExec.exe',
      commandLine: 'CcmExec.exe /runservice',
      parent: 'services.exe',
      user: 'SYSTEM',
    },
    {
      name: 'powershell.exe',
      executable: POWERSHELL,
      commandLine: 'powershell.exe -File \\\\fileshare\\deploy\\inventory.ps1',
      parent: 'CcmExec.exe',
      user: 'SYSTEM',
    },
    {
      name: 'GoogleUpdate.exe',
      executable: 'C:\\Program Files (x86)\\Google\\Update\\GoogleUpdate.exe',
      commandLine: 'GoogleUpdate.exe /ua /installsource scheduler',
      parent: 'svchost.exe',
      user: 'SYSTEM',
    },
  ],
  network: [MANAGEMENT_DESTINATION],
};

/** The bait alerts' encoded PowerShell and scheduled task, started by the management agent. */
const MANAGED_BAIT_HOST: HostWorld = {
  entity: { 'asset.criticality': 'medium_impact' },
  processes: [
    {
      name: 'CcmExec.exe',
      executable: 'C:\\Windows\\CCM\\CcmExec.exe',
      commandLine: 'CcmExec.exe /runservice',
      parent: 'services.exe',
      user: 'SYSTEM',
    },
    {
      name: 'powershell.exe',
      executable: POWERSHELL,
      commandLine: BAIT_ENCODED_COMMAND_LINE,
      parent: 'CcmExec.exe',
      user: 'SYSTEM',
    },
    {
      name: 'schtasks.exe',
      executable: 'C:\\Windows\\System32\\schtasks.exe',
      commandLine:
        'schtasks.exe /create /tn "Configuration Manager Health Evaluation" /tr C:\\Windows\\CCM\\ccmeval.exe /sc daily /ru SYSTEM /f',
      parent: 'CcmExec.exe',
      user: 'SYSTEM',
    },
  ],
  network: [MANAGEMENT_DESTINATION, { ...MANAGEMENT_DESTINATION, process: 'powershell.exe' }],
};

const SCHEDULED_BACKUP_HOST: HostWorld = {
  entity: { 'asset.criticality': 'high_impact' },
  processes: [
    {
      name: 'backup_job.exe',
      executable: 'C:\\Program Files\\BackupAgent\\backup_job.exe',
      commandLine: 'backup_job.exe --nightly',
      parent: 'taskhostw.exe',
      user: 'svc-backup',
    },
  ],
  network: [{ process: 'backup_job.exe', ip: '10.20.0.40', domain: 'backup01.corp.example' }],
};

const CLICKFIX_HOST: HostWorld = {
  entity: {
    'entity.sub_type': 'Workstation',
    'asset.criticality': 'medium_impact',
    'asset.owner': 'j.meyer',
  },
  processes: [
    {
      name: 'powershell.exe',
      executable: POWERSHELL,
      commandLine: "powershell.exe -WInDo Min $a1='QkJCQkJCQkJCQkJCQmNkbi5leGFtcGxl'",
      parent: 'explorer.exe',
      user: 'j.meyer',
    },
    {
      name: 'svc_helper.exe',
      executable: 'C:\\ProgramData\\k3x9q2\\svc_helper.exe',
      commandLine: 'svc_helper.exe',
      parent: 'powershell.exe',
      user: 'j.meyer',
    },
  ],
  network: [
    { process: 'powershell.exe', ip: '192.0.2.44' },
    { process: 'svc_helper.exe', ip: '198.51.100.23' },
  ],
};

interface ScenarioWorld {
  hosts: Readonly<Record<string, HostWorld>>;
  /** Thin user records, for the users the alerts cite. */
  users: readonly string[];
}

const BENIGN_HOSTS = [
  'WS-HR-101',
  'WS-HR-102',
  'WS-ENG-201',
  'WS-ENG-202',
  'WS-FIN-301',
  'SRV-PRINT-01',
];

const WORLDS: Readonly<Record<string, ScenarioWorld>> = {
  'positive-chain-with-noise': { hosts: { 'WS-FIN-214': CLICKFIX_HOST }, users: ['j.meyer'] },
  'benign-batch': {
    hosts: Object.fromEntries(BENIGN_HOSTS.map((host) => [host, BENIGN_HOST])),
    users: [],
  },
  'threshold-meta-alerts': {
    hosts: { 'SRV-FILE-02': SCHEDULED_BACKUP_HOST, 'SRV-APP-07': SCHEDULED_BACKUP_HOST },
    users: ['svc-backup', 'm.novak'],
  },
  'seeded-false-positive': {
    hosts: { 'WS-MGMT-201': BENIGN_HOST, 'WS-MGMT-202': BENIGN_HOST },
    users: [],
  },
  [BAIT_FALSE_POSITIVE_SCENARIO_ID]: {
    hosts: { 'WS-MGMT-201': MANAGED_BAIT_HOST, 'WS-MGMT-202': MANAGED_BAIT_HOST },
    users: [],
  },
};

export const hasWorld = (scenarioId: string): boolean => scenarioId in WORLDS;

const EVENT_SPACING_MS = 10_000;

/**
 * Builds the documents of one seed. `anchorMsByHost` is the earliest seeded alert time per host
 * name; events sit just after it, inside the review's two-hour window around the alerts.
 */
export const buildWorld = ({
  scenarioId,
  runMarker,
  spaceId,
  anchorMsByHost,
}: {
  scenarioId: string;
  runMarker: string;
  spaceId: string;
  anchorMsByHost: ReadonlyMap<string, number>;
}): WorldDoc[] => {
  const world = WORLDS[scenarioId];
  if (!world) return [];
  const docs: WorldDoc[] = [];
  const nextId = (what: string): string => `${runMarker}-world-${what}-${docs.length}`;

  for (const [host, spec] of Object.entries(world.hosts)) {
    const hostId = hostIdFor(host);
    const anchor = anchorMsByHost.get(host) ?? Date.now();
    docs.push({
      kind: 'entity',
      id: nextId('entity'),
      index: entitiesIndexForSpace(spaceId),
      body: {
        '@timestamp': new Date(anchor).toISOString(),
        'entity.id': `host:${host}`,
        'entity.type': 'host',
        'entity.name': host,
        'host.name': host,
        'host.id': hostId,
        ...spec.entity,
      },
    });
    const base = { 'host.id': hostId, 'host.name': host, 'agent.id': `agent-${hostId}` };
    spec.processes.forEach((process, index) => {
      docs.push({
        kind: 'event',
        id: nextId('process'),
        index: processEventsIndexForSpace(spaceId),
        body: {
          ...base,
          '@timestamp': new Date(anchor + (index + 1) * EVENT_SPACING_MS).toISOString(),
          'event.category': ['process'],
          'event.action': 'start',
          'user.name': process.user,
          'process.name': process.name,
          'process.executable': process.executable,
          'process.command_line': process.commandLine,
          'process.parent.name': process.parent,
          'process.entity_id': `${hostId}-${process.name}`,
        },
      });
    });
    spec.network.forEach((connection, index) => {
      docs.push({
        kind: 'event',
        id: nextId('network'),
        index: networkEventsIndexForSpace(spaceId),
        body: {
          ...base,
          '@timestamp': new Date(
            anchor + (spec.processes.length + index + 1) * EVENT_SPACING_MS
          ).toISOString(),
          'event.category': ['network'],
          'event.action': 'connection_attempted',
          'process.name': connection.process,
          'process.entity_id': `${hostId}-${connection.process}`,
          'network.direction': 'egress',
          'destination.ip': connection.ip,
          ...(connection.domain ? { 'destination.domain': connection.domain } : {}),
        },
      });
    });
  }

  for (const user of world.users) {
    docs.push({
      kind: 'entity',
      id: nextId('entity'),
      index: entitiesIndexForSpace(spaceId),
      body: {
        '@timestamp': new Date().toISOString(),
        'entity.id': `user:${user}`,
        'entity.type': 'user',
        'entity.name': user,
        'user.name': user,
      },
    });
  }
  return docs;
};
